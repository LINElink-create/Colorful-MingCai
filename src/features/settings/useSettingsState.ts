import browser from 'webextension-polyfill'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type { BackendAccount } from '../../shared/types/auth'
import type { CloudSyncState, CloudUploadPreview } from '../../shared/types/sync'
import type {
  BackendAccountResult,
  BackendConfigResult,
  CloudUploadPreviewResult,
  CloudSyncResult,
  TranslationPreferencesResult,
  TranslationProviderStatusResult
} from '../../shared/types/message'
import {
  DEFAULT_BACKEND_CONFIG,
  DEFAULT_TRANSLATION_PREFERENCES,
  type BackendConfig,
  type TranslationProvider,
  type TranslationProviderConfigInput,
  type TranslationPreferences,
  type TranslationProviderStatus
} from '../../shared/types/translation'
import { sendMessageToBackground } from '../../modules/messaging/sendToBackground'

export const useSettingsState = (options?: { autoRefresh?: boolean; autoSync?: boolean }) => {
  const isLoading = ref(false)
  const isSaving = ref(false)
  const errorMessage = ref('')
  const translationPreferences = ref<TranslationPreferences>({ ...DEFAULT_TRANSLATION_PREFERENCES })
  const backendConfig = ref<BackendConfig>({ ...DEFAULT_BACKEND_CONFIG })
  const providerStatuses = ref<TranslationProviderStatus[]>([])
  const currentAccount = ref<BackendAccount | null>(null)
  const cloudSyncState = ref<CloudSyncState | null>(null)
  const isSyncing = ref(false)
  const isAuthenticated = computed(() => backendConfig.value.authState === 'authenticated' && currentAccount.value !== null)

  const primaryProviderStatus = computed(() => {
    return providerStatuses.value.find((provider) => provider.provider === translationPreferences.value.defaultProvider) ?? null
  })

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
      const backendConfigResult = await sendMessageToBackground<BackendConfigResult>({
        type: MESSAGE_TYPES.GET_BACKEND_CONFIG,
        payload: {}
      })

      if (!backendConfigResult.ok) {
        throw new Error(backendConfigResult.error)
      }

      backendConfig.value = backendConfigResult.data.config

      if (options?.autoSync !== false && backendConfigResult.data.config.authState === 'authenticated') {
        const syncResult = await sendMessageToBackground<CloudSyncResult>({
          type: MESSAGE_TYPES.PULL_CLOUD_STATE,
          payload: { automatic: true }
        })

        if (syncResult.ok) {
          cloudSyncState.value = syncResult.data
        }
      }

      const [preferencesResult, providerStatusResult, accountResult, syncStateStored] = await Promise.all([
        sendMessageToBackground<TranslationPreferencesResult>({
          type: MESSAGE_TYPES.GET_TRANSLATION_PREFERENCES,
          payload: {}
        }),
        sendMessageToBackground<TranslationProviderStatusResult>({
          type: MESSAGE_TYPES.GET_TRANSLATION_PROVIDER_STATUS,
          payload: {}
        }),
        backendConfigResult.data.config.authState === 'authenticated'
          ? sendMessageToBackground<BackendAccountResult>({
            type: MESSAGE_TYPES.GET_BACKEND_ACCOUNT,
            payload: {}
          })
          : Promise.resolve({ ok: true as const, data: { account: null } }),
        browser.storage.local.get(STORAGE_KEYS.cloudSyncState)
      ])

      if (!preferencesResult.ok) {
        throw new Error(preferencesResult.error)
      }

      if (!providerStatusResult.ok) {
        throw new Error(providerStatusResult.error)
      }

      if (!accountResult.ok) {
        throw new Error(accountResult.error)
      }

      translationPreferences.value = preferencesResult.data.preferences
      providerStatuses.value = providerStatusResult.data.providers
      currentAccount.value = accountResult.data.account
      cloudSyncState.value =
        (syncStateStored[STORAGE_KEYS.cloudSyncState] as CloudSyncState | undefined) ?? cloudSyncState.value
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

  const saveProviderConfig = async (payload: TranslationProviderConfigInput) => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground<TranslationProviderStatusResult>({
        type: MESSAGE_TYPES.SAVE_TRANSLATION_PROVIDER_CONFIG,
        payload
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      providerStatuses.value = result.data.providers
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存服务商配置失败'
    } finally {
      isSaving.value = false
    }
  }

  const deleteProviderConfig = async (provider: TranslationProvider) => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground<TranslationProviderStatusResult>({
        type: MESSAGE_TYPES.DELETE_TRANSLATION_PROVIDER_CONFIG,
        payload: { provider }
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      providerStatuses.value = result.data.providers
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '删除服务商配置失败'
    } finally {
      isSaving.value = false
    }
  }

  const registerAccount = async (payload: { email: string; password: string; displayName: string }) => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground<{ account: BackendAccount; config: BackendConfig }>({
        type: MESSAGE_TYPES.REGISTER_BACKEND_ACCOUNT,
        payload
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      backendConfig.value = result.data.config
      currentAccount.value = result.data.account
      await refresh()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '注册失败'
    } finally {
      isSaving.value = false
    }
  }

  const loginAccount = async (payload: { email: string; password: string }) => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground<{ account: BackendAccount; config: BackendConfig }>({
        type: MESSAGE_TYPES.LOGIN_BACKEND_ACCOUNT,
        payload
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      backendConfig.value = result.data.config
      currentAccount.value = result.data.account
      await refresh()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '登录失败'
    } finally {
      isSaving.value = false
    }
  }

  const logoutAccount = async () => {
    isSaving.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground({
        type: MESSAGE_TYPES.LOGOUT_BACKEND_ACCOUNT,
        payload: {}
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      currentAccount.value = null
      await refresh()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '退出登录失败'
    } finally {
      isSaving.value = false
    }
  }

  const syncCloud = async () => {
    isSyncing.value = true
    errorMessage.value = ''

    try {
      const previewResult = await sendMessageToBackground<CloudUploadPreviewResult>({
        type: MESSAGE_TYPES.PREVIEW_CLOUD_UPLOAD,
        payload: {}
      })

      if (!previewResult.ok) {
        throw new Error(previewResult.error)
      }

      const preview: CloudUploadPreview = previewResult.data
      const confirmed = globalThis.confirm(
          `本次将上传 ${preview.mergedBucketCount} 个站点、${preview.mergedAnnotationCount} 条高亮和笔记。API 接口及相关配置不会上传。确认继续吗？`
      )

      if (!confirmed) {
        return
      }

      const result = await sendMessageToBackground<CloudSyncResult>({
        type: MESSAGE_TYPES.CONFIRM_CLOUD_UPLOAD,
        payload: {}
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      cloudSyncState.value = result.data
      await refresh()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '云同步失败'
    } finally {
      isSyncing.value = false
    }
  }

  const handleStorageChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    if (areaName !== 'local') {
      return
    }

    const translationPreferencesChange = changes[STORAGE_KEYS.translationPreferences]
    const backendConfigChange = changes[STORAGE_KEYS.backendConfig]
    const cloudSyncStateChange = changes[STORAGE_KEYS.cloudSyncState]

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

      if (backendConfig.value.authState !== 'authenticated') {
        currentAccount.value = null
      }

      void refreshProviderStatuses().catch((error) => {
        errorMessage.value = error instanceof Error ? error.message : '刷新翻译状态失败'
      })
    }

    if (cloudSyncStateChange) {
      cloudSyncState.value = (cloudSyncStateChange.newValue as CloudSyncState | undefined) ?? null
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
    currentAccount,
    cloudSyncState,
    isSyncing,
    isAuthenticated,
    primaryProviderStatus,
    refresh,
    saveTranslationPreferences,
    saveTranslationConfig,
    saveProviderConfig,
    deleteProviderConfig,
    registerAccount,
    loginAccount,
    logoutAccount,
    syncCloud,
    clearError
  }
}