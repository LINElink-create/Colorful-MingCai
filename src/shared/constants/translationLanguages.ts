import type { TranslationLanguageCode } from '../types/translation'

export const TRANSLATION_LANGUAGE_OPTIONS: Array<{ value: TranslationLanguageCode; label: string }> = [
  { value: 'auto', label: '自动识别' },
  { value: 'zh-CHS', label: '简体中文' },
  { value: 'en', label: '英语' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'fr', label: '法语' },
  { value: 'de', label: '德语' },
  { value: 'es', label: '西班牙语' },
  { value: 'ru', label: '俄语' }
]