export type TranslationLanguageCode = 'auto' | 'zh-CHS' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru'

export type TranslationSettings = {
  appKey: string
  appSecret: string
  sourceLanguage: TranslationLanguageCode
  targetLanguage: Exclude<TranslationLanguageCode, 'auto'>
}

export type TranslationResult = {
  query: string
  translation: string
  detectedSourceLanguage: string
  targetLanguage: string
  provider: 'youdao'
}

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  appKey: '',
  appSecret: '',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CHS'
}