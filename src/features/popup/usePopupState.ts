import browser from 'webextension-polyfill'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { EXPORT_FORMATS, type ExportFormat } from '../../shared/constants/exportFormats'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type { AnnotationRecord } from '../../shared/types/annotation'
import type { ActivePageInfo } from '../../shared/types/page'
import type { RuntimeMessageResult } from '../../shared/types/message'
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
// 这个 composable 把“读取当前页、导出、导入、清空、错误处理、加载态”统一收口，
// 从而让 App.vue 只负责展示，而不直接处理浏览器 API 与消息细节。
export const usePopupState = () => {
  const isLoading = ref(false)
  const errorMessage = ref('')
  const pageInfo = ref<ActivePageInfo>(emptyPageInfo())
  const annotations = ref<AnnotationRecord[]>([])
  const isClearConfirmOpen = ref(false)
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

  const refresh = async () => {
    // 刷新 UI 所需状态：加载当前活跃标签页信息并读取对应注释
    isLoading.value = true
    errorMessage.value = ''

    try {
      // 获取当前活动 tab 的信息（title/url/tabId）
      pageInfo.value = await getActivePageInfo()

      // 若无法获取 url（例如弹窗在无活跃页面时），清空注释并返回
      if (!pageInfo.value.url) {
        annotations.value = []
        return
      }

      // 加载当前页面的注释分桶并设置到响应式列表
      await syncAnnotationsForPage(pageInfo.value.url)
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

  // 清空当前页的注释：请求 background 执行清空逻辑，成功后刷新当前标签页以让 content script 重新加载最新状态。
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

    // 请求 background 清空当前页面的注释存储
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

      // 本地状态也清空以实时反映 UI
      annotations.value = []
      isClearConfirmOpen.value = false

      // 触发当前标签页刷新，让 content script 重新按最新存储状态加载页面高亮。
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
    // 请求 background 执行导出逻辑（下载由 background 触发），UI 仅显示加载状态
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
    // 将文件文本上报给 background 执行导入并在完成后刷新本地状态
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

      // 导入成功后刷新当前页面注释显示
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
  const handleStorageChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    const pageBucketsChange = changes[STORAGE_KEYS.pageBuckets]

    if (areaName !== 'local' || !pageBucketsChange || !pageInfo.value.url) {
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
    isClearConfirmOpen,
    isDeleteConfirmOpen,
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
    importAnnotations
  }
}