import browser from 'webextension-polyfill'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listPageBuckets, removeAnnotationsByIds } from '../../modules/annotations/repository/annotationRepository'
import { findTabIdsByPageUrl, openExtensionPage, openTab } from '../../modules/browser/tabs'
import { sendMessageToBackground } from '../../modules/messaging/sendToBackground'
import { sendMessageToTab } from '../../modules/messaging/sendToActiveTab'
import { EXPORT_FORMATS, type ExportFormat } from '../../shared/constants/exportFormats'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import { ANNOTATION_COLORS } from '../../shared/constants/annotationColors'
import type { AnnotationColor, AnnotationRecord, PageAnnotationBucket } from '../../shared/types/annotation'

const colorMetaMap = Object.fromEntries(ANNOTATION_COLORS.map((item) => [item.value, item])) as Record<
  AnnotationColor,
  { value: AnnotationColor; label: string; swatch: string }
>

export const useHistoryOverview = () => {
  const isLoading = ref(false)
  const errorMessage = ref('')
  const buckets = ref<PageAnnotationBucket[]>([])

  const refresh = async () => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      buckets.value = await listPageBuckets()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载历史总览失败'
    } finally {
      isLoading.value = false
    }
  }

  const totalAnnotations = computed(() => {
    return buckets.value.reduce((total, bucket) => total + bucket.annotations.length, 0)
  })

  const totalNotes = computed(() => {
    return buckets.value.reduce((total, bucket) => {
      return total + bucket.annotations.filter((annotation) => annotation.note?.trim()).length
    }, 0)
  })

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

  const openOriginalPage = async (url: string) => {
    await openTab(url)
  }

  const openSettingsPage = async () => {
    await openExtensionPage('/settings.html')
  }

  const syncRemoveFromOpenTabs = async (url: string, annotationId: string) => {
    const tabIds = await findTabIdsByPageUrl(url)

    if (tabIds.length === 0) {
      return
    }

    const tasks = tabIds.map((tabId) => {
      return sendMessageToTab(tabId, {
        type: MESSAGE_TYPES.REMOVE_ANNOTATION_BY_ID,
        payload: { annotationId }
      })
    })

    await Promise.allSettled(tasks)
  }

  const removeAnnotation = async (bucket: PageAnnotationBucket, annotation: AnnotationRecord) => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      await removeAnnotationsByIds(bucket.url, [annotation.id])
      await syncRemoveFromOpenTabs(bucket.url, annotation.id)
      await refresh()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '删除历史高亮失败'
    } finally {
      isLoading.value = false
    }
  }

  const getColorMeta = (color: AnnotationColor) => {
    return colorMetaMap[color]
  }

  const handleStorageChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.pageBuckets]) {
      return
    }

    void refresh()
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
    buckets,
    totalAnnotations,
    totalNotes,
    refresh,
    exportAnnotations,
    importAnnotations,
    openOriginalPage,
    openSettingsPage,
    removeAnnotation,
    getColorMeta
  }
}