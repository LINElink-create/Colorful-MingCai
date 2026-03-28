import browser from 'webextension-polyfill'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type {
  BackendConfigResult,
  TranslationPreferencesResult,
  TranslationProviderStatusResult
} from '../../shared/types/message'
import {
  DEFAULT_BACKEND_CONFIG,
  DEFAULT_TRANSLATION_PREFERENCES,
  type BackendConfig,
  type TranslationPreferences,
  type TranslationProviderStatus
} from '../../shared/types/translation'
import { sendMessageToBackground } from '../../modules/messaging/sendToBackground'

export const useSettingsState = (options?: { autoRefresh?: boolean }) => {
  const isLoading = ref(false)
  const isSaving = ref(false)
  const errorMessage = ref('')
  const translationPreferences = ref<TranslationPreferences>({ ...DEFAULT_TRANSLATION_PREFERENCES })
  const backendConfig = ref<BackendConfig>({ ...DEFAULT_BACKEND_CONFIG })
  const providerStatuses = ref<TranslationProviderStatus[]>([])

  const primaryProviderStatus = computed(() => providerStatuses.value[0] ?? null)

  const refreshProviderStatuses = async () => {
    const result = await sendMessageToBackground<TranslationProviderStatusResult>({
      type: MESSAGE_TYPES.GET_TRANSLATION_PROVIDER_STATUS,
      payload: {}
    })

    if (!result.ok) {
      throw new Error(result.error)
    }

    providerStatuses.value = result.data.providers
  }

  const refresh = async () => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const [preferencesResult, backendConfigResult, providerStatusResult] = await Promise.all([
        sendMessageToBackground<TranslationPreferencesResult>({
          type: MESSAGE_TYPES.GET_TRANSLATION_PREFERENCES,
          payload: {}
        }),
        sendMessageToBackground<BackendConfigResult>({
          type: MESSAGE_TYPES.GET_BACKEND_CONFIG,
          payload: {}
        }),
        sendMessageToBackground<TranslationProviderStatusResult>({
          type: MESSAGE_TYPES.GET_TRANSLATION_PROVIDER_STATUS,
          payload: {}
        })
      ])

      if (!preferencesResult.ok) {
        throw new Error(preferencesResult.error)
      }

      if (!backendConfigResult.ok) {
        throw new Error(backendConfigResult.error)
      }

      if (!providerStatusResult.ok) {
        throw new Error(providerStatusResult.error)
      }

      translationPreferences.value = preferencesResult.data.preferences
      backendConfig.value = backendConfigResult.data.config
      providerStatuses.value = providerStatusResult.data.providers
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载设置失败'
    } finally {
      isLoading.value = false
    }
  }

  const saveTranslationPreferences = async (preferences: TranslationPreferences) => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground<TranslationPreferencesResult>({
        type: MESSAGE_TYPES.SAVE_TRANSLATION_PREFERENCES,
        payload: preferences
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      translationPreferences.value = result.data.preferences
      await refreshProviderStatuses()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存翻译偏好失败'
    } finally {
      isSaving.value = false
    }
  }

  const saveTranslationConfig = async (payload: {
    preferences: TranslationPreferences
    backendConfig: BackendConfig
  }) => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const [preferencesResult, backendConfigResult] = await Promise.all([
        sendMessageToBackground<TranslationPreferencesResult>({
          type: MESSAGE_TYPES.SAVE_TRANSLATION_PREFERENCES,
          payload: payload.preferences
        }),
        sendMessageToBackground<BackendConfigResult>({
          type: MESSAGE_TYPES.SAVE_BACKEND_CONFIG,
          payload: payload.backendConfig
        })
      ])

      if (!preferencesResult.ok) {
        throw new Error(preferencesResult.error)
      }

      if (!backendConfigResult.ok) {
        throw new Error(backendConfigResult.error)
      }

      translationPreferences.value = preferencesResult.data.preferences
      backendConfig.value = backendConfigResult.data.config
      await refreshProviderStatuses()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存设置失败'
    } finally {
      isSaving.value = false
    }
  }

  const clearError = () => {
    errorMessage.value = ''
  }

  const handleStorageChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    if (areaName !== 'local') {
      return
    }

    const translationPreferencesChange = changes[STORAGE_KEYS.translationPreferences]
    const backendConfigChange = changes[STORAGE_KEYS.backendConfig]

    if (translationPreferencesChange) {
      translationPreferences.value = {
        ...DEFAULT_TRANSLATION_PREFERENCES,
        ...((translationPreferencesChange.newValue as Partial<TranslationPreferences> | undefined) ?? {})
      }
    }

    if (backendConfigChange) {
      backendConfig.value = {
        ...DEFAULT_BACKEND_CONFIG,
        ...((backendConfigChange.newValue as Partial<BackendConfig> | undefined) ?? {})
      }

      void refreshProviderStatuses().catch((error) => {
        errorMessage.value = error instanceof Error ? error.message : '刷新翻译状态失败'
      })
    }
  }

  onMounted(() => {
    browser.storage.onChanged.addListener(handleStorageChanged)

    if (options?.autoRefresh !== false) {
      void refresh()
    }
  })

  onBeforeUnmount(() => {
    browser.storage.onChanged.removeListener(handleStorageChanged)
  })

  return {
    isLoading,
    isSaving,
    errorMessage,
    translationPreferences,
    backendConfig,
    providerStatuses,
    primaryProviderStatus,
    refresh,
    saveTranslationPreferences,
    saveTranslationConfig,
    clearError
  }
}