import browser from 'webextension-polyfill'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import { DEFAULT_TRANSLATION_SETTINGS, type TranslationSettings } from '../../shared/types/translation'

const sanitizeSettings = (settings: Partial<TranslationSettings>): TranslationSettings => ({
  appKey: settings.appKey?.trim() ?? '',
  appSecret: settings.appSecret?.trim() ?? '',
  sourceLanguage: settings.sourceLanguage ?? DEFAULT_TRANSLATION_SETTINGS.sourceLanguage,
  targetLanguage: settings.targetLanguage ?? DEFAULT_TRANSLATION_SETTINGS.targetLanguage
})

export const getTranslationSettings = async (): Promise<TranslationSettings> => {
  const stored = await browser.storage.local.get(STORAGE_KEYS.translationSettings)
  return sanitizeSettings(((stored[STORAGE_KEYS.translationSettings] as Partial<TranslationSettings> | undefined) ?? {}))
}

export const saveTranslationSettings = async (settings: TranslationSettings) => {
  const nextSettings = sanitizeSettings(settings)

  await browser.storage.local.set({
    [STORAGE_KEYS.translationSettings]: nextSettings
  })

  return nextSettings
}