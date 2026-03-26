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

export type BackendTranslatePayload = {
  text: string
  preferences: Pick<TranslationPreferences, 'sourceLanguage' | 'targetLanguage' | 'defaultProvider'>
  pageUrl?: string
  pageTitle?: string
  extensionVersion?: string
}

const buildHeaders = (config: BackendConfig) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (config.accessToken) {
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

export const translateWithBackend = async (
  payload: BackendTranslatePayload,
  config: BackendConfig
): Promise<TranslationResult> => {
  const response = await fetch(`${ensureBaseUrl(config)}/v1/translation/translate`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({
      text: payload.text,
      source_language: payload.preferences.sourceLanguage,
      target_language: payload.preferences.targetLanguage,
      provider_hint: payload.preferences.defaultProvider,
      client_context: {
        extension_version: payload.extensionVersion,
        page_url: payload.pageUrl,
        page_title: payload.pageTitle
      }
    })
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `后端翻译请求失败（${response.status}）`))
  }

  const data = (await response.json()) as {
    translated_text: string
    detected_source_language: string
    target_language: string
    provider: 'youdao'
  }

  return {
    query: payload.text.trim(),
    translation: data.translated_text,
    detectedSourceLanguage: data.detected_source_language,
    targetLanguage: data.target_language,
    provider: data.provider
  }
}

export const getTranslationProviderStatuses = async (
  config: BackendConfig
): Promise<TranslationProviderStatus[]> => {
  const response = await fetch(`${ensureBaseUrl(config)}/v1/account/providers`, {
    headers: buildHeaders(config)
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `获取翻译服务状态失败（${response.status}）`))
  }

  const data = (await response.json()) as {
    providers: Array<{
      provider: 'youdao'
      platform_available: boolean
      user_configured: boolean
      config_mode: 'managed' | 'byo_key' | null
      status: 'available' | 'unavailable' | 'not_configured'
      last_error_code?: string | null
    }>
  }

  return data.providers.map((provider) => ({
    provider: provider.provider,
    platformAvailable: provider.platform_available,
    userConfigured: provider.user_configured,
    configMode: provider.config_mode,
    status: provider.status,
    lastErrorCode: provider.last_error_code ?? undefined
  }))
}
