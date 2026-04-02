import browser from 'webextension-polyfill'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import {
  DEFAULT_TRANSLATION_PREFERENCES,
  type TranslationPreferences
} from '../../shared/types/translation'
import type { TranslationPreferencesSnapshot } from '../../shared/types/sync'
import { nowIsoString } from '../../shared/utils/time'

const sanitizePreferences = (preferences: Partial<TranslationPreferences>): TranslationPreferences => ({
  defaultProvider: preferences.defaultProvider ?? DEFAULT_TRANSLATION_PREFERENCES.defaultProvider,
  sourceLanguage: preferences.sourceLanguage ?? DEFAULT_TRANSLATION_PREFERENCES.sourceLanguage,
  targetLanguage: preferences.targetLanguage ?? DEFAULT_TRANSLATION_PREFERENCES.targetLanguage,
  autoTranslateEnabled: preferences.autoTranslateEnabled ?? DEFAULT_TRANSLATION_PREFERENCES.autoTranslateEnabled
})

const sanitizeUpdatedAt = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value : nowIsoString()
}

export const getTranslationPreferencesSnapshot = async (): Promise<TranslationPreferencesSnapshot> => {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.translationPreferences,
    STORAGE_KEYS.translationPreferencesUpdatedAt
  ])

  return {
    preferences: sanitizePreferences(
      ((stored[STORAGE_KEYS.translationPreferences] as Partial<TranslationPreferences> | undefined) ?? {})
    ),
    updatedAt: sanitizeUpdatedAt(stored[STORAGE_KEYS.translationPreferencesUpdatedAt])
  }
}

export const getTranslationPreferences = async (): Promise<TranslationPreferences> => {
  const snapshot = await getTranslationPreferencesSnapshot()
  return snapshot.preferences
}

export const saveTranslationPreferences = async (preferences: TranslationPreferences, updatedAt = nowIsoString()) => {
  const nextPreferences = sanitizePreferences(preferences)

  await browser.storage.local.set({
    [STORAGE_KEYS.translationPreferences]: nextPreferences,
    [STORAGE_KEYS.translationPreferencesUpdatedAt]: updatedAt
  })

  return nextPreferences
}

export const saveTranslationPreferencesSnapshot = async (snapshot: TranslationPreferencesSnapshot) => {
  return saveTranslationPreferences(snapshot.preferences, snapshot.updatedAt)
}
