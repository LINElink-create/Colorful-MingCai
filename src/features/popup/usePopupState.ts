import browser from 'webextension-polyfill'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type { AnnotationRecord } from '../../shared/types/annotation'
import type { BackendConfigResult, CloudSyncResult, RuntimeMessageResult } from '../../shared/types/message'
import type { ActivePageInfo } from '../../shared/types/page'
import type { TranslationPreferences } from '../../shared/types/translation'
import { getActivePageInfo, openExtensionPage, reloadTabById } from '../../modules/browser/tabs'
import { sendMessageToBackground } from '../../modules/messaging/sendToBackground'
import { sendMessageToTab } from '../../modules/messaging/sendToActiveTab'
import { getPageKey } from '../../shared/utils/pageKey'
import { loadCurrentPageAnnotations } from './useCurrentPageAnnotations'
import { useSettingsState } from '../settings/useSettingsState'

const emptyPageInfo = (): ActivePageInfo => ({
  tabId: null,
  title: '',
  url: ''
})

// Popup 的状态编排中心。
// 这里统一管理“当前页摘要、语言偏好、单条删除确认、清空确认、历史与设置入口”等动作，
// 让 App.vue 继续保持展示层角色，不直接耦合 tabs、storage 或 runtime message 细节。
export const usePopupState = () => {
  const settingsState = useSettingsState({ autoRefresh: false, autoSync: false })
  const isLoading = ref(false)
  const localErrorMessage = ref('')
  const pageInfo = ref<ActivePageInfo>(emptyPageInfo())
  const annotations = ref<AnnotationRecord[]>([])
  const isClearConfirmOpen = ref(false)
  const pendingDeleteAnnotationId = ref('')
  const pendingDeleteAnnotation = ref<AnnotationRecord | null>(null)
  const isDeleteConfirmOpen = computed(() => pendingDeleteAnnotationId.value !== '')
  const errorMessage = computed(() => localErrorMessage.value || settingsState.errorMessage.value)

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

  const refresh = async () => {
    // 刷新 UI 所需状态：加载当前活跃标签页信息、读取对应注释，并同步翻译配置
    isLoading.value = true
    localErrorMessage.value = ''
    settingsState.clearError()

    try {
      pageInfo.value = await getActivePageInfo()

      const backendConfigResult = await sendMessageToBackground<BackendConfigResult>({
        type: MESSAGE_TYPES.GET_BACKEND_CONFIG,
        payload: {}
      })

      if (!backendConfigResult.ok) {
        throw new Error(backendConfigResult.error)
      }

      if (backendConfigResult.data.config.authState === 'authenticated') {
        const syncResult = await sendMessageToBackground<CloudSyncResult>({
          type: MESSAGE_TYPES.PULL_CLOUD_STATE,
          payload: { automatic: true }
        })

        if (!syncResult.ok) {
          throw new Error(syncResult.error)
        }
      }

      if (!pageInfo.value.url) {
        annotations.value = []
        await settingsState.refresh()
        return
      }

      await Promise.all([syncAnnotationsForPage(pageInfo.value.url), settingsState.refresh()])
    } catch (error) {
      localErrorMessage.value = error instanceof Error ? error.message : '加载当前页数据失败'
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
    localErrorMessage.value = ''

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
      localErrorMessage.value = error instanceof Error ? error.message : '清空失败'
    } finally {
      isLoading.value = false
    }
  }

  const removeAnnotation = async (annotationId: string) => {
    if (!pageInfo.value.tabId) {
      localErrorMessage.value = '当前标签页不可用，无法删除这条高亮'
      return
    }

    isLoading.value = true
    localErrorMessage.value = ''

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
      localErrorMessage.value = error instanceof Error ? error.message : '删除高亮失败'
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

  const jumpToAnnotation = async (annotation: AnnotationRecord) => {
    if (pageInfo.value.tabId === null) {
      localErrorMessage.value = '当前标签页不可用，无法跳转到这条高亮'
      return
    }

    isLoading.value = true
    localErrorMessage.value = ''

    try {
      const result = await sendMessageToTab(pageInfo.value.tabId, {
        type: MESSAGE_TYPES.NAVIGATE_TO_ANNOTATION,
        payload: { annotationId: annotation.id }
      }) as RuntimeMessageResult

      if (!result.ok) {
        throw new Error(result.error)
      }

      window.close()
    } catch (error) {
      localErrorMessage.value = error instanceof Error ? error.message : '跳转到高亮位置失败'
    } finally {
      isLoading.value = false
    }
  }

  const openHistoryOverview = async () => {
    try {
      await openExtensionPage('/history.html')
    } catch (error) {
      localErrorMessage.value = error instanceof Error ? error.message : '打开历史总览失败'
    }
  }

  const openSettingsPage = async () => {
    try {
      await openExtensionPage('/settings.html')
    } catch (error) {
      localErrorMessage.value = error instanceof Error ? error.message : '打开设置页面失败'
    }
  }

  const saveLanguagePreferences = async (preferences: TranslationPreferences) => {
    settingsState.clearError()
    localErrorMessage.value = ''
    await settingsState.saveTranslationPreferences(preferences)
  }

  const handleStorageChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    const pageBucketsChange = changes[STORAGE_KEYS.pageBuckets]

    if (areaName !== 'local') {
      return
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
    translationPreferences: settingsState.translationPreferences,
    providerStatuses: settingsState.providerStatuses,
    isClearConfirmOpen,
    isDeleteConfirmOpen,
    isSavingTranslationConfig: settingsState.isSaving,
    pendingDeleteAnnotation,
    refresh,
    requestClearCurrentPage,
    cancelClearCurrentPage,
    clearCurrentPage,
    openHistoryOverview,
    openSettingsPage,
    jumpToAnnotation,
    requestRemoveAnnotation,
    cancelRemoveAnnotation,
    confirmRemoveAnnotation,
    saveLanguagePreferences
  }
}