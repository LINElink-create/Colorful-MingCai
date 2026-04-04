import type { ExportBundle } from '../../shared/types/annotation'
import type { BackendAccount, BackendAuthSession } from '../../shared/types/auth'
import type {
  AuthMessageResult,
  DeleteAccountResult,
  VerificationStatusResult
} from '../../shared/types/message'
import type { TranslationPreferencesSnapshot } from '../../shared/types/sync'
import {
  type BackendConfig,
  type TranslationProvider,
  type TranslationProviderConfigInput,
  type TranslationPreferences,
  type TranslationProviderStatus,
  type TranslationResult
} from '../../shared/types/translation'
import { saveBackendConfig } from './backendConfigRepository'

type ValidationIssue = {
  loc?: Array<string | number>
  msg?: string
}

const withDiagnosticPath = (message: string, path: string, status?: number) => {
  const statusText = typeof status === 'number' ? `，状态码：${status}` : ''
  return `${message}（接口：${path}${statusText}）`
}

const mapValidationIssueMessage = (issue: ValidationIssue) => {
  const field = String(issue.loc?.[issue.loc.length - 1] ?? '')
  const message = String(issue.msg ?? '')

  if (field === 'email') {
    return message.includes('Field required') ? '请填写邮箱' : '请输入正确的邮箱地址'
  }

  if (field === 'password') {
    if (message.includes('Field required')) {
      return '请填写密码'
    }

    if (message.includes('at least') || message.includes('at least 8')) {
      return '密码至少 8 位'
    }

    return '密码格式无效'
  }

  if (field === 'displayName' || field === 'display_name') {
    return message.includes('Field required') ? '请填写用户名' : '用户名格式无效'
  }

  if (message.includes('Field required')) {
    return '请完整填写必填信息'
  }

  return ''
}

const mapKnownBackendMessage = (message: string, status: number, path: string) => {
  if (path === '/v1/auth/register') {
    if (message.includes('该邮箱已注册')) {
      return '该邮箱已注册'
    }

    if (message.includes('邮箱格式无效')) {
      return '请输入正确的邮箱地址'
    }
  }

  if (path === '/v1/auth/login' && message.includes('邮箱或密码错误')) {
    return '邮箱或密码错误'
  }

  if (path === '/v1/account/delete' && message.includes('确认邮箱不匹配')) {
    return '确认邮箱不匹配'
  }

  if (status >= 500) {
    return withDiagnosticPath('服务暂时不可用，请稍后再试', path, status)
  }

  return message
}

const parseErrorDetail = (detail: unknown, status: number, path: string, fallbackMessage: string) => {
  if (typeof detail === 'string') {
    return mapKnownBackendMessage(detail, status, path) || fallbackMessage
  }

  if (Array.isArray(detail)) {
    const issueMessage = detail
      .map((issue) => mapValidationIssueMessage(issue as ValidationIssue))
      .find((message) => Boolean(message))

    return issueMessage || fallbackMessage
  }

  return fallbackMessage
}

const parseErrorMessage = async (response: Response, fallbackMessage: string, path: string) => {
  try {
    const rawText = await response.text()

    if (!rawText) {
      return mapKnownBackendMessage(fallbackMessage, response.status, path)
    }

    try {
      const payload = JSON.parse(rawText) as { detail?: unknown }
      return parseErrorDetail(payload.detail, response.status, path, rawText || fallbackMessage)
    } catch {
      return mapKnownBackendMessage(rawText || fallbackMessage, response.status, path)
    }
  } catch {
    return mapKnownBackendMessage(fallbackMessage, response.status, path)
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
  let response: Response

  try {
    response = await fetch(`${ensureBaseUrl(config)}${path}`, {
      method: options.method ?? 'GET',
      headers: buildHeaders(config, options.includeAuth ?? true),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    })
  } catch {
    throw new Error(withDiagnosticPath('无法连接服务，请检查网络或稍后再试', path))
  }

  if (!response.ok) {
    throw new BackendRequestError(
      await parseErrorMessage(response, `${options.fallbackMessage}（${response.status}）`, path),
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

const parseProviderStatus = (provider: Record<string, unknown>): TranslationProviderStatus => {
  const summary = pickValue<Record<string, unknown> | null | undefined>(provider, 'configSummary', 'config_summary')

  return {
    provider: pickValue<TranslationProvider>(provider, 'provider', 'provider'),
    platformAvailable: pickValue<boolean>(provider, 'platformAvailable', 'platform_available'),
    userConfigured: pickValue<boolean>(provider, 'userConfigured', 'user_configured'),
    configMode: pickValue<'managed' | 'byo_key' | null>(provider, 'configMode', 'config_mode'),
    status: pickValue<'available' | 'unavailable' | 'not_configured'>(provider, 'status', 'status'),
    lastErrorCode: pickValue<string | null | undefined>(provider, 'lastErrorCode', 'last_error_code') ?? undefined,
    configSummary: summary
      ? {
          credentialHint: pickValue<string | null | undefined>(summary, 'credentialHint', 'credential_hint') ?? undefined,
          endpointUrl: pickValue<string | null | undefined>(summary, 'endpointUrl', 'endpoint_url') ?? undefined,
          model: pickValue<string | null | undefined>(summary, 'model', 'model') ?? undefined,
        }
      : null,
  }
}

export const translateWithBackend = async (
  payload: BackendTranslatePayload,
  config: BackendConfig
): Promise<TranslationResult> => {
  const result = await withBackendRefresh(config, saveBackendConfig, async (activeConfig) => {
    return requestJson<Record<string, unknown>>('/v1/translation/translate', activeConfig, {
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
  })

  const data = result.data

  return {
    query: payload.text.trim(),
    translation: pickValue<string>(data, 'translatedText', 'translated_text'),
    detectedSourceLanguage: pickValue<string>(data, 'detectedSourceLanguage', 'detected_source_language'),
    targetLanguage: pickValue<string>(data, 'targetLanguage', 'target_language'),
    provider: pickValue<TranslationProvider>(data, 'provider', 'provider')
  }
}

export const getTranslationProviderStatuses = async (
  config: BackendConfig
): Promise<TranslationProviderStatus[]> => {
  const result = await withBackendRefresh(config, saveBackendConfig, async (activeConfig) => {
    return requestJson<{
      providers: Array<Record<string, unknown>>
    }>('/v1/account/providers', activeConfig, {
      fallbackMessage: '获取翻译服务状态失败'
    })
  })

  return result.data.providers.map(parseProviderStatus)
}

export const saveTranslationProviderConfig = async (
  config: BackendConfig,
  payload: TranslationProviderConfigInput
): Promise<TranslationProviderStatus[]> => {
  const path = `/v1/translation/provider-configs/${payload.provider}`
  const body = payload.provider === 'youdao'
    ? {
        youdaoAppKey: payload.appKey,
        youdaoAppSecret: payload.appSecret,
      }
    : {
        openaiBaseUrl: payload.baseUrl,
        openaiApiKey: payload.apiKey,
        openaiModel: payload.model,
      }

  const result = await withBackendRefresh(config, saveBackendConfig, async (activeConfig) => {
    return requestJson<Array<Record<string, unknown>>>(path, activeConfig, {
      method: 'PUT',
      fallbackMessage: '保存翻译服务商配置失败',
      body,
    })
  })

  return result.data.map(parseProviderStatus)
}

export const deleteTranslationProviderConfig = async (
  config: BackendConfig,
  provider: TranslationProvider
): Promise<TranslationProviderStatus[]> => {
  const result = await withBackendRefresh(config, saveBackendConfig, async (activeConfig) => {
    return requestJson<Array<Record<string, unknown>>>(`/v1/translation/provider-configs/${provider}`, activeConfig, {
      method: 'DELETE',
      fallbackMessage: '删除翻译服务商配置失败',
    })
  })

  return result.data.map(parseProviderStatus)
}

export const registerBackendAccount = async (
  config: BackendConfig,
  payload: { email: string; password: string; displayName: string }
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

export const deleteBackendAccount = async (
  config: BackendConfig,
  payload: { confirmEmail: string }
) => {
  return requestJson<DeleteAccountResult>('/v1/account/delete', config, {
    method: 'POST',
    fallbackMessage: '注销账号失败',
    body: payload
  })
}

export const getBackendAccountVerificationStatus = async (config: BackendConfig) => {
  return requestJson<VerificationStatusResult>('/v1/auth/verification/status', config, {
    fallbackMessage: '获取邮箱验证状态失败'
  })
}

export const sendBackendVerificationEmail = async (
  config: BackendConfig,
  payload: { email: string }
) => {
  return requestJson<AuthMessageResult>('/v1/auth/verification/send', config, {
    method: 'POST',
    fallbackMessage: '发送验证邮件失败',
    body: payload
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
