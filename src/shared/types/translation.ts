export type TranslationLanguageCode = 'auto' | 'zh-CHS' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru'

export type TranslationProvider = 'youdao' | 'openai_compatible'

export type BackendAuthState = 'anonymous' | 'authenticated'

export type TranslationProviderBindingMode = 'managed' | 'byo_key'

export type TranslationProviderConfigSummary = {
  credentialHint?: string
  endpointUrl?: string
  model?: string
}

export type YoudaoProviderConfigInput = {
  provider: 'youdao'
  appKey: string
  appSecret: string
}

export type OpenAICompatibleProviderConfigInput = {
  provider: 'openai_compatible'
  baseUrl: string
  apiKey: string
  model: string
}

export type TranslationProviderConfigInput = YoudaoProviderConfigInput | OpenAICompatibleProviderConfigInput

export type TranslationPreferences = {
  defaultProvider: TranslationProvider
  sourceLanguage: TranslationLanguageCode
  targetLanguage: Exclude<TranslationLanguageCode, 'auto'>
  autoTranslateEnabled: boolean
}

export type BackendConfig = {
  baseUrl: string
  authState: BackendAuthState
  accessToken: string
  refreshToken: string
}

export type TranslationProviderStatus = {
  provider: TranslationProvider
  platformAvailable: boolean
  userConfigured: boolean
  configMode: TranslationProviderBindingMode | null
  status: 'available' | 'unavailable' | 'not_configured'
  lastErrorCode?: string
  configSummary?: TranslationProviderConfigSummary | null
}

export type TranslationResult = {
  query: string
  translation: string
  detectedSourceLanguage: string
  targetLanguage: string
  provider: TranslationProvider
}

export const PRODUCTION_BACKEND_BASE_URL = 'https://www.mingcai-colorful.top'

const resolveDefaultBackendBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL?.trim()

  if (!configuredBaseUrl) {
    return PRODUCTION_BACKEND_BASE_URL
  }

  return configuredBaseUrl.replace(/\/$/, '')
}

export const DEFAULT_BACKEND_BASE_URL = resolveDefaultBackendBaseUrl()

export const DEFAULT_TRANSLATION_PREFERENCES: TranslationPreferences = {
  defaultProvider: 'youdao',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CHS',
  autoTranslateEnabled: false
}

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  baseUrl: DEFAULT_BACKEND_BASE_URL,
  authState: 'anonymous',
  accessToken: '',
  refreshToken: ''
}