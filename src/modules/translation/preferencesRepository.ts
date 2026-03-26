import browser from 'webextension-polyfill'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import {
  DEFAULT_TRANSLATION_PREFERENCES,
  type TranslationPreferences
} from '../../shared/types/translation'

const sanitizePreferences = (preferences: Partial<TranslationPreferences>): TranslationPreferences => ({
  defaultProvider: preferences.defaultProvider ?? DEFAULT_TRANSLATION_PREFERENCES.defaultProvider,
  sourceLanguage: preferences.sourceLanguage ?? DEFAULT_TRANSLATION_PREFERENCES.sourceLanguage,
  targetLanguage: preferences.targetLanguage ?? DEFAULT_TRANSLATION_PREFERENCES.targetLanguage,
  autoTranslateEnabled: preferences.autoTranslateEnabled ?? DEFAULT_TRANSLATION_PREFERENCES.autoTranslateEnabled
})

export const getTranslationPreferences = async (): Promise<TranslationPreferences> => {
  const stored = await browser.storage.local.get(STORAGE_KEYS.translationPreferences)
  return sanitizePreferences(
    ((stored[STORAGE_KEYS.translationPreferences] as Partial<TranslationPreferences> | undefined) ?? {})
  )
}

export const saveTranslationPreferences = async (preferences: TranslationPreferences) => {
  const nextPreferences = sanitizePreferences(preferences)

  await browser.storage.local.set({
    [STORAGE_KEYS.translationPreferences]: nextPreferences
  })

  return nextPreferences
}
