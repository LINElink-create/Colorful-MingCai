import browser from 'webextension-polyfill'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { EXPORT_FORMATS, type ExportFormat } from '../../shared/constants/exportFormats'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type { AnnotationRecord } from '../../shared/types/annotation'
import type {
  BackendConfigResult,
  RuntimeMessageResult,
  TranslationPreferencesResult,
  TranslationProviderStatusResult
} from '../../shared/types/message'
import type { ActivePageInfo } from '../../shared/types/page'
import {
  DEFAULT_BACKEND_CONFIG,
  DEFAULT_TRANSLATION_PREFERENCES,
  type BackendConfig,
  type TranslationPreferences,
  type TranslationProviderStatus
} from '../../shared/types/translation'
import { getActivePageInfo, openExtensionPage, reloadTabById } from '../../modules/browser/tabs'
import { sendMessageToBackground } from '../../modules/messaging/sendToBackground'
import { getPageKey } from '../../shared/utils/pageKey'
import { loadCurrentPageAnnotations } from './useCurrentPageAnnotations'

const emptyPageInfo = (): ActivePageInfo => ({
  tabId: null,
  title: '',
  url: ''
})

// Popup 的状态编排中心。
// 这里统一管理“当前页摘要、翻译配置、导出导入、单条删除确认、清空确认、历史总览入口”等动作，
// 让 App.vue 继续保持展示层角色，不直接耦合 tabs、storage 或 runtime message 细节。
export const usePopupState = () => {
  const isLoading = ref(false)
  const errorMessage = ref('')
  const pageInfo = ref<ActivePageInfo>(emptyPageInfo())
  const annotations = ref<AnnotationRecord[]>([])
  const translationPreferences = ref<TranslationPreferences>({ ...DEFAULT_TRANSLATION_PREFERENCES })
  const backendConfig = ref<BackendConfig>({ ...DEFAULT_BACKEND_CONFIG })
  const providerStatuses = ref<TranslationProviderStatus[]>([])
  const isClearConfirmOpen = ref(false)
  const isSavingTranslationConfig = ref(false)
  const pendingDeleteAnnotationId = ref('')
  const pendingDeleteAnnotation = ref<AnnotationRecord | null>(null)
  const isDeleteConfirmOpen = computed(() => pendingDeleteAnnotationId.value !== '')

  const syncPendingDeleteAnnotation = () => {
    pendingDeleteAnnotation.value =
      annotations.value.find((annotation) => annotation.id === pendingDeleteAnnotationId.value) ?? null

    if (!pendingDeleteAnnotation.value && pendingDeleteAnnotationId.value) {
      pendingDeleteAnnotationId.value = ''
    }
  }

  const syncAnnotationsForPage = async (url: string) => {
    if (!url) {
      annotations.value = []
      syncPendingDeleteAnnotation()
      return
    }

    const bucket = await loadCurrentPageAnnotations(url)
    annotations.value = bucket?.annotations ?? []
    syncPendingDeleteAnnotation()
  }

  const syncTranslationConfig = async () => {
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
  }

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
    // 刷新 UI 所需状态：加载当前活跃标签页信息、读取对应注释，并同步翻译配置
    isLoading.value = true
    errorMessage.value = ''

    try {
      pageInfo.value = await getActivePageInfo()

      if (!pageInfo.value.url) {
        annotations.value = []
        await syncTranslationConfig()
        return
      }

      await Promise.all([syncAnnotationsForPage(pageInfo.value.url), syncTranslationConfig()])
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载当前页数据失败'
    } finally {
      isLoading.value = false
    }
  }

  const requestClearCurrentPage = () => {
    if (!pageInfo.value.url) {
      return
    }

    isClearConfirmOpen.value = true
  }

  const cancelClearCurrentPage = () => {
    isClearConfirmOpen.value = false
  }

  const requestRemoveAnnotation = (annotationId: string) => {
    pendingDeleteAnnotationId.value = annotationId
    syncPendingDeleteAnnotation()
  }

  const cancelRemoveAnnotation = () => {
    pendingDeleteAnnotationId.value = ''
    pendingDeleteAnnotation.value = null
  }

  const clearCurrentPage = async () => {
    if (!pageInfo.value.url) {
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground({
        type: MESSAGE_TYPES.CLEAR_CURRENT_PAGE_ANNOTATIONS,
        payload: { url: pageInfo.value.url }
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      annotations.value = []
      isClearConfirmOpen.value = false

      if (pageInfo.value.tabId !== null) {
        await reloadTabById(pageInfo.value.tabId)
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '清空失败'
    } finally {
      isLoading.value = false
    }
  }

  const exportAnnotations = async (format: ExportFormat) => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground({
        type: MESSAGE_TYPES.EXPORT_ANNOTATIONS,
        payload: { format }
      })

      if (!result.ok) {
        throw new Error(result.error)
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : `导出 ${format || EXPORT_FORMATS.JSON} 失败`
    } finally {
      isLoading.value = false
    }
  }

  const importAnnotations = async (rawText: string) => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const result = await sendMessageToBackground({
        type: MESSAGE_TYPES.IMPORT_ANNOTATIONS,
        payload: { rawText, mode: 'merge' }
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      await refresh()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '导入失败'
    } finally {
      isLoading.value = false
    }
  }

  const removeAnnotation = async (annotationId: string) => {
    if (!pageInfo.value.tabId) {
      errorMessage.value = '当前标签页不可用，无法删除该高亮'
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      const result = (await browser.tabs.sendMessage(pageInfo.value.tabId, {
        type: MESSAGE_TYPES.REMOVE_ANNOTATION_BY_ID,
        payload: { annotationId }
      })) as RuntimeMessageResult<{ bucket: { annotations?: AnnotationRecord[] } | null; removedCount: number }>

      if (!result.ok) {
        throw new Error(result.error)
      }

      annotations.value = result.data?.bucket?.annotations ?? []
      cancelRemoveAnnotation()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '删除高亮失败'
    } finally {
      isLoading.value = false
    }
  }

  const confirmRemoveAnnotation = async () => {
    if (!pendingDeleteAnnotationId.value) {
      return
    }

    await removeAnnotation(pendingDeleteAnnotationId.value)
  }

  const openHistoryOverview = async () => {
    try {
      await openExtensionPage('/history.html')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '打开历史总览失败'
    }
  }

  const saveTranslationConfig = async (payload: {
    preferences: TranslationPreferences
    backendConfig: BackendConfig
  }) => {
    isSavingTranslationConfig.value = true
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
      errorMessage.value = error instanceof Error ? error.message : '保存翻译配置失败'
    } finally {
      isSavingTranslationConfig.value = false
    }
  }

  const handleStorageChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    const pageBucketsChange = changes[STORAGE_KEYS.pageBuckets]
    const translationPreferencesChange = changes[STORAGE_KEYS.translationPreferences]
    const backendConfigChange = changes[STORAGE_KEYS.backendConfig]

    if (areaName !== 'local') {
      return
    }

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
    }

    if (!pageInfo.value.url || !pageBucketsChange) {
      return
    }

    const currentPageKey = getPageKey(pageInfo.value.url)
    const nextBuckets = pageBucketsChange.newValue as Record<string, { annotations?: AnnotationRecord[] }> | undefined
    const nextBucket = nextBuckets?.[currentPageKey]
    annotations.value = nextBucket?.annotations ?? []
    syncPendingDeleteAnnotation()
  }

  onMounted(() => {
    browser.storage.onChanged.addListener(handleStorageChanged)
    void refresh()
  })

  onBeforeUnmount(() => {
    browser.storage.onChanged.removeListener(handleStorageChanged)
  })

  return {
    isLoading,
    errorMessage,
    pageInfo,
    annotations,
    translationPreferences,
    backendConfig,
    providerStatuses,
    isClearConfirmOpen,
    isDeleteConfirmOpen,
    isSavingTranslationConfig,
    pendingDeleteAnnotation,
    refresh,
    requestClearCurrentPage,
    cancelClearCurrentPage,
    clearCurrentPage,
    openHistoryOverview,
    requestRemoveAnnotation,
    cancelRemoveAnnotation,
    confirmRemoveAnnotation,
    exportAnnotations,
    importAnnotations,
    saveTranslationConfig
  }
}