import type { ExportBundle } from '../../shared/types/annotation'
import type { BackendAccount, BackendAuthSession } from '../../shared/types/auth'
import type { TranslationPreferencesSnapshot } from '../../shared/types/sync'
import {
  type BackendConfig,
  type TranslationPreferences,
  type TranslationProviderStatus,
  type TranslationResult
} from '../../shared/types/translation'

const parseErrorMessage = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = (await response.json()) as { detail?: string }
    return payload.detail || fallbackMessage
  } catch {
    const rawText = await response.text()
    return rawText || fallbackMessage
  }
}

export class BackendRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'BackendRequestError'
    this.status = status
  }
}

export type BackendTranslatePayload = {
  text: string
  preferences: Pick<TranslationPreferences, 'sourceLanguage' | 'targetLanguage' | 'defaultProvider'>
  pageUrl?: string
  pageTitle?: string
  extensionVersion?: string
}

const buildHeaders = (config: BackendConfig, includeAuth = true) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (includeAuth && config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`
  }

  return headers
}

const ensureBaseUrl = (config: BackendConfig) => {
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('请先配置后端服务地址')
  }

  return baseUrl
}

const requestJson = async <TData>(
  path: string,
  config: BackendConfig,
  options: {
    method?: string
    body?: unknown
    includeAuth?: boolean
    fallbackMessage: string
  }
): Promise<TData> => {
  const response = await fetch(`${ensureBaseUrl(config)}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(config, options.includeAuth ?? true),
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  })

  if (!response.ok) {
    throw new BackendRequestError(
      await parseErrorMessage(response, `${options.fallbackMessage}（${response.status}）`),
      response.status
    )
  }

  if (response.status === 204) {
    return undefined as TData
  }

  return (await response.json()) as TData
}

const pickValue = <TValue>(data: Record<string, unknown>, camelKey: string, snakeKey: string) => {
  return (data[camelKey] ?? data[snakeKey]) as TValue
}

export const translateWithBackend = async (
  payload: BackendTranslatePayload,
  config: BackendConfig
): Promise<TranslationResult> => {
  const data = await requestJson<Record<string, unknown>>('/v1/translation/translate', config, {
    method: 'POST',
    fallbackMessage: '后端翻译请求失败',
    body: {
      text: payload.text,
      source_language: payload.preferences.sourceLanguage,
      target_language: payload.preferences.targetLanguage,
      provider_hint: payload.preferences.defaultProvider,
      client_context: {
        extension_version: payload.extensionVersion,
        page_url: payload.pageUrl,
        page_title: payload.pageTitle
      }
    }
  })

  return {
    query: payload.text.trim(),
    translation: pickValue<string>(data, 'translatedText', 'translated_text'),
    detectedSourceLanguage: pickValue<string>(data, 'detectedSourceLanguage', 'detected_source_language'),
    targetLanguage: pickValue<string>(data, 'targetLanguage', 'target_language'),
    provider: pickValue<'youdao'>(data, 'provider', 'provider')
  }
}

export const getTranslationProviderStatuses = async (
  config: BackendConfig
): Promise<TranslationProviderStatus[]> => {
  const data = await requestJson<{
    providers: Array<Record<string, unknown>>
  }>('/v1/account/providers', config, {
    fallbackMessage: '获取翻译服务状态失败'
  })

  return data.providers.map((provider) => ({
    provider: pickValue<'youdao'>(provider, 'provider', 'provider'),
    platformAvailable: pickValue<boolean>(provider, 'platformAvailable', 'platform_available'),
    userConfigured: pickValue<boolean>(provider, 'userConfigured', 'user_configured'),
    configMode: pickValue<'managed' | 'byo_key' | null>(provider, 'configMode', 'config_mode'),
    status: pickValue<'available' | 'unavailable' | 'not_configured'>(provider, 'status', 'status'),
    lastErrorCode: pickValue<string | null | undefined>(provider, 'lastErrorCode', 'last_error_code') ?? undefined
  }))
}

export const registerBackendAccount = async (
  config: BackendConfig,
  payload: { email: string; password: string; displayName?: string }
) => {
  return requestJson<BackendAuthSession>('/v1/auth/register', config, {
    method: 'POST',
    includeAuth: false,
    fallbackMessage: '注册失败',
    body: payload
  })
}

export const loginBackendAccount = async (
  config: BackendConfig,
  payload: { email: string; password: string }
) => {
  return requestJson<BackendAuthSession>('/v1/auth/login', config, {
    method: 'POST',
    includeAuth: false,
    fallbackMessage: '登录失败',
    body: payload
  })
}

export const refreshBackendSession = async (config: BackendConfig, refreshToken = config.refreshToken) => {
  return requestJson<BackendAuthSession>('/v1/auth/refresh', config, {
    method: 'POST',
    includeAuth: false,
    fallbackMessage: '刷新登录状态失败',
    body: { refreshToken }
  })
}

export const logoutBackendAccount = async (config: BackendConfig) => {
  return requestJson<{ message: string }>('/v1/auth/logout', config, {
    method: 'POST',
    fallbackMessage: '退出登录失败',
    body: {}
  })
}

export const getCurrentBackendAccount = async (config: BackendConfig) => {
  return requestJson<BackendAccount>('/v1/auth/me', config, {
    fallbackMessage: '获取当前账号失败'
  })
}

export const getCloudAnnotationBundle = async (config: BackendConfig) => {
  return requestJson<ExportBundle>('/v1/annotations/documents', config, {
    fallbackMessage: '获取云端高亮失败'
  })
}

export const replaceCloudAnnotationBundle = async (config: BackendConfig, bundle: ExportBundle) => {
  return requestJson<ExportBundle & { savedCount: number }>('/v1/annotations/documents/bulk', config, {
    method: 'PUT',
    fallbackMessage: '保存云端高亮失败',
    body: bundle
  })
}

export const getCloudTranslationPreferences = async (config: BackendConfig) => {
  const data = await requestJson<Record<string, unknown>>('/v1/translation/preferences', config, {
    fallbackMessage: '获取云端翻译偏好失败'
  })

  return {
    preferences: {
      defaultProvider: pickValue<TranslationPreferences['defaultProvider']>(data, 'defaultProvider', 'default_provider'),
      sourceLanguage: pickValue<TranslationPreferences['sourceLanguage']>(data, 'sourceLanguage', 'source_language'),
      targetLanguage: pickValue<TranslationPreferences['targetLanguage']>(data, 'targetLanguage', 'target_language'),
      autoTranslateEnabled: pickValue<boolean>(data, 'autoTranslateEnabled', 'auto_translate_enabled')
    },
    updatedAt: pickValue<string>(data, 'updatedAt', 'updated_at')
  } satisfies TranslationPreferencesSnapshot
}

export const replaceCloudTranslationPreferences = async (
  config: BackendConfig,
  snapshot: TranslationPreferencesSnapshot
) => {
  const data = await requestJson<Record<string, unknown>>('/v1/translation/preferences', config, {
    method: 'PUT',
    fallbackMessage: '保存云端翻译偏好失败',
    body: {
      defaultProvider: snapshot.preferences.defaultProvider,
      sourceLanguage: snapshot.preferences.sourceLanguage,
      targetLanguage: snapshot.preferences.targetLanguage,
      autoTranslateEnabled: snapshot.preferences.autoTranslateEnabled
    }
  })

  return {
    preferences: {
      defaultProvider: pickValue<TranslationPreferences['defaultProvider']>(data, 'defaultProvider', 'default_provider'),
      sourceLanguage: pickValue<TranslationPreferences['sourceLanguage']>(data, 'sourceLanguage', 'source_language'),
      targetLanguage: pickValue<TranslationPreferences['targetLanguage']>(data, 'targetLanguage', 'target_language'),
      autoTranslateEnabled: pickValue<boolean>(data, 'autoTranslateEnabled', 'auto_translate_enabled')
    },
    updatedAt: pickValue<string>(data, 'updatedAt', 'updated_at')
  } satisfies TranslationPreferencesSnapshot
}

export const withBackendRefresh = async <TData>(
  config: BackendConfig,
  persistConfig: (config: BackendConfig) => Promise<unknown>,
  task: (config: BackendConfig) => Promise<TData>
) => {
  try {
    return { config, data: await task(config) }
  } catch (error) {
    if (!(error instanceof BackendRequestError) || error.status !== 401 || !config.refreshToken) {
      throw error
    }

    const session = await refreshBackendSession(config)
    const nextConfig: BackendConfig = {
      ...config,
      authState: 'authenticated',
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    }
    await persistConfig(nextConfig)
    return {
      config: nextConfig,
      data: await task(nextConfig)
    }
  }
}
