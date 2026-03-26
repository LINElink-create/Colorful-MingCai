export type TranslationLanguageCode = 'auto' | 'zh-CHS' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru'

export type TranslationProvider = 'youdao'

export type BackendAuthState = 'anonymous' | 'authenticated'

export type TranslationProviderBindingMode = 'managed' | 'byo_key'

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
}

export type TranslationResult = {
  query: string
  translation: string
  detectedSourceLanguage: string
  targetLanguage: string
  provider: 'youdao'
}

export const DEFAULT_TRANSLATION_PREFERENCES: TranslationPreferences = {
  defaultProvider: 'youdao',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CHS',
  autoTranslateEnabled: false
}

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  baseUrl: 'http://127.0.0.1:8000',
  authState: 'anonymous',
  accessToken: '',
  refreshToken: ''
}