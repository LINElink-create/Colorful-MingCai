import { buildJsonExport } from '../export/jsonExporter'
import { buildMarkdownExport } from '../export/markdownExporter'
import { importAnnotations } from '../export/importAnnotations'
import { createAnnotationFromRange } from '../annotations/domain/createAnnotation'
import { restoreAnnotation } from '../annotations/domain/restoreAnnotation'
import { removeRenderedAnnotation } from '../annotations/rendering/highlightRenderer'
import { normalizeRange } from '../annotations/rendering/rangeNormalizer'
import { clearPageAnnotations, exportAnnotationBundle, getPageBucket, removeAnnotationsByIds, saveAnnotation } from '../annotations/repository/annotationRepository'
import { downloadTextFile } from '../browser/downloads'
import {
  confirmCloudUpload,
  deleteCloudAccount,
  getCloudVerificationStatus,
  loginCloudAccount,
  loadCloudAccount,
  logoutCloudAccount,
  previewCloudUpload,
  pullCloudState,
  registerCloudAccount,
  sendCloudVerificationEmail,
  syncCloudState,
} from '../cloud/cloudAccountService'
import { EXPORT_FORMATS } from '../../shared/constants/exportFormats'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { getBackendConfig, saveBackendConfig } from '../translation/backendConfigRepository'
import {
  deleteTranslationProviderConfig,
  getTranslationProviderStatuses,
  saveTranslationProviderConfig,
  translateWithBackend,
} from '../translation/backendClient'
import { getTranslationPreferences, saveTranslationPreferences } from '../translation/preferencesRepository'
import type { RuntimeMessage, RuntimeMessageResult } from '../../shared/types/message'
import { getPageKey } from '../../shared/utils/pageKey'

type RouterContext = {
  source?: 'content' | 'background'
}

const createOk = <TData>(data: TData): RuntimeMessageResult<TData> => ({ ok: true, data })

const createError = (error: string): RuntimeMessageResult => ({ ok: false, error })

const findAnnotationIdsInSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return []
  }

  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    return []
  }

  const elements = Array.from(document.querySelectorAll('mark[data-mingcai-id]'))
  const annotationIds = new Set<string>()

  for (const element of elements) {
    if (!range.intersectsNode(element)) {
      continue
    }

    const annotationId = element.getAttribute('data-mingcai-id')
    if (annotationId) {
      annotationIds.add(annotationId)
    }
  }

  return Array.from(annotationIds)
}

const handleCreateAnnotationFromSelection = async (message: RuntimeMessage) => {
  // 校验消息类型，确保调用者意图正确
  if (message.type !== MESSAGE_TYPES.CREATE_ANNOTATION_FROM_SELECTION) {
    return createError('Unsupported message')
  }

  // 获取当前页面的用户选区（Selection）并取第一个 Range
  const selection = window.getSelection()
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  // 把原生 Range 规范化为项目内部使用的结构，便于后续序列化与恢复
  const normalizedRange = range ? normalizeRange(range) : null

  // 如果没有有效选区，则返回错误提示（供调用方显示或记录）
  if (!normalizedRange) {
    return createError('当前没有可高亮的有效选区')
  }

  // 基于规范化的 Range 创建 Annotation 域对象（不包含存储逻辑）
  const annotation = createAnnotationFromRange(
    normalizedRange,
    getPageKey(window.location.href),
    document.title,
    message.payload.color ?? 'yellow',
    message.payload.note?.trim() ?? ''
  )

  // 在页面中渲染该 annotation（立即可见）
  restoreAnnotation(annotation)
  // 将 annotation 持久化到仓库并返回所在的 bucket
  const bucket = await saveAnnotation(annotation)

  // 清除用户选区，恢复页面到无选中状态
  selection?.removeAllRanges()
  // 返回成功结果，包含更新后的 bucket
  return createOk({ bucket })
}

const handleRemoveAnnotationsFromSelection = async (message: RuntimeMessage) => {
  if (message.type !== MESSAGE_TYPES.REMOVE_ANNOTATIONS_FROM_SELECTION) {
    return createError('Unsupported message')
  }

  const annotationIds = findAnnotationIdsInSelection()
  if (annotationIds.length === 0) {
    return createError('当前选区中没有可取消的高亮')
  }

  for (const annotationId of annotationIds) {
    removeRenderedAnnotation(annotationId)
  }

  const bucket = await removeAnnotationsByIds(getPageKey(window.location.href), annotationIds)
  window.getSelection()?.removeAllRanges()
  return createOk({ bucket, removedCount: annotationIds.length })
}

const handleRemoveAnnotationById = async (message: RuntimeMessage) => {
  if (message.type !== MESSAGE_TYPES.REMOVE_ANNOTATION_BY_ID) {
    return createError('Unsupported message')
  }

  removeRenderedAnnotation(message.payload.annotationId)
  const bucket = await removeAnnotationsByIds(getPageKey(window.location.href), [message.payload.annotationId])
  return createOk({ bucket, removedCount: 1 })
}

const handleNavigateToAnnotation = async (message: RuntimeMessage) => {
  if (message.type !== MESSAGE_TYPES.NAVIGATE_TO_ANNOTATION) {
    return createError('Unsupported message')
  }

  const target = Array.from(document.querySelectorAll('mark[data-mingcai-id]')).find((element) => {
    return element.getAttribute('data-mingcai-id') === message.payload.annotationId
  })

  if (!(target instanceof HTMLElement)) {
    return createError('当前页面未找到这条高亮')
  }

  document.querySelectorAll('mark[data-mingcai-jump-target="true"]').forEach((element) => {
    element.removeAttribute('data-mingcai-jump-target')
  })

  target.setAttribute('data-mingcai-jump-target', 'true')
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

  window.setTimeout(() => {
    if (target.isConnected) {
      target.removeAttribute('data-mingcai-jump-target')
    }
  }, 1800)

  return createOk(undefined)
}

export const routeRuntimeMessage = async (message: RuntimeMessage, context: RouterContext = {}) => {
  try {
    // 当消息来自 content script 时，运行在页面上下文中，可直接操作 DOM
    if (context.source === 'content') {
      if (message.type === MESSAGE_TYPES.CREATE_ANNOTATION_FROM_SELECTION) {
        // 在 content 端创建并渲染注释（使用页面选区）
        return await handleCreateAnnotationFromSelection(message)
      }

      if (message.type === MESSAGE_TYPES.REMOVE_ANNOTATION_BY_ID) {
        return await handleRemoveAnnotationById(message)
      }

      if (message.type === MESSAGE_TYPES.REMOVE_ANNOTATIONS_FROM_SELECTION) {
        return await handleRemoveAnnotationsFromSelection(message)
      }

      if (message.type === MESSAGE_TYPES.NAVIGATE_TO_ANNOTATION) {
        return await handleNavigateToAnnotation(message)
      }

      if (message.type === MESSAGE_TYPES.RESTORE_PAGE_ANNOTATIONS) {
        // 恢复当前页面的所有注释到 DOM（用于页面加载后恢复高亮）
        const bucket = await getPageBucket(getPageKey(window.location.href))
        for (const annotation of bucket?.annotations ?? []) {
          restoreAnnotation(annotation)
        }
        return createOk({ restoredCount: bucket?.annotations.length ?? 0 })
      }

      return createError('Content script 不支持该消息')
    }

    // 非 content（通常来自 popup 或 background）的消息路由与处理
    switch (message.type) {
      case MESSAGE_TYPES.GET_CURRENT_PAGE_ANNOTATIONS: {
        // 根据传入 url 获取页面注释分桶
        const bucket = await getPageBucket(getPageKey(message.payload.url))
        return createOk({ bucket })
      }
      case MESSAGE_TYPES.CLEAR_CURRENT_PAGE_ANNOTATIONS: {
        // 清空指定页面的所有注释
        await clearPageAnnotations(getPageKey(message.payload.url))
        return createOk(undefined)
      }
      case MESSAGE_TYPES.EXPORT_ANNOTATIONS: {
        // 导出全部注释，支持 JSON 与 Markdown 两种格式
        const bundle = await exportAnnotationBundle()
        const isJson = message.payload.format === EXPORT_FORMATS.JSON
        const content = isJson ? buildJsonExport(bundle) : buildMarkdownExport(bundle)
        const filename = isJson ? 'mingcai-export.json' : 'mingcai-export.md'
        const mimeType = isJson ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'

        // 触发下载（由 background 或调用方执行）
        await downloadTextFile(filename, content, mimeType)
        return createOk({ filename, count: bundle.buckets.length })
      }
      case MESSAGE_TYPES.IMPORT_ANNOTATIONS: {
        // 从文本导入注释包并返回导入结果
        const bundle = await importAnnotations(message.payload.rawText, message.payload.mode)
        return createOk({ bundle, importedBucketCount: bundle.buckets.length })
      }
      case MESSAGE_TYPES.RESTORE_PAGE_ANNOTATIONS: {
        // 获取并返回指定页面的注释分桶（不在页面上直接渲染）
        const bucket = await getPageBucket(getPageKey(message.payload.url))
        return createOk({ bucket })
      }
      case MESSAGE_TYPES.TRANSLATE_SELECTION: {
        const [config, preferences] = await Promise.all([getBackendConfig(), getTranslationPreferences()])
        const result = await translateWithBackend(
          {
            text: message.payload.text,
            preferences,
            pageUrl: message.payload.pageUrl,
            pageTitle: message.payload.pageTitle
          },
          config
        )
        return createOk({ result })
      }
      case MESSAGE_TYPES.GET_TRANSLATION_PREFERENCES: {
        const preferences = await getTranslationPreferences()
        return createOk({ preferences })
      }
      case MESSAGE_TYPES.SAVE_TRANSLATION_PREFERENCES: {
        const preferences = await saveTranslationPreferences(message.payload)
        return createOk({ preferences })
      }
      case MESSAGE_TYPES.GET_BACKEND_CONFIG: {
        const config = await getBackendConfig()
        return createOk({ config })
      }
      case MESSAGE_TYPES.REGISTER_BACKEND_ACCOUNT: {
        const result = await registerCloudAccount(message.payload)
        return createOk({ account: result.account, config: result.config, message: result.message })
      }
      case MESSAGE_TYPES.LOGIN_BACKEND_ACCOUNT: {
        const result = await loginCloudAccount(message.payload)
        return createOk({ account: result.account, config: result.config })
      }
      case MESSAGE_TYPES.LOGOUT_BACKEND_ACCOUNT: {
        await logoutCloudAccount()
        return createOk(undefined)
      }
      case MESSAGE_TYPES.DELETE_BACKEND_ACCOUNT: {
        const result = await deleteCloudAccount(message.payload)
        return createOk(result)
      }
      case MESSAGE_TYPES.GET_BACKEND_ACCOUNT: {
        const account = await loadCloudAccount()
        return createOk({ account })
      }
      case MESSAGE_TYPES.GET_ACCOUNT_VERIFICATION_STATUS: {
        const result = await getCloudVerificationStatus()
        return createOk(result)
      }
      case MESSAGE_TYPES.SEND_VERIFICATION_EMAIL: {
        const messageText = await sendCloudVerificationEmail(message.payload.email)
        return createOk({ message: messageText })
      }
      case MESSAGE_TYPES.PULL_CLOUD_STATE: {
        const result = await pullCloudState()
        return createOk(result)
      }
      case MESSAGE_TYPES.PREVIEW_CLOUD_UPLOAD: {
        const result = await previewCloudUpload()
        return createOk(result)
      }
      case MESSAGE_TYPES.CONFIRM_CLOUD_UPLOAD: {
        const result = await confirmCloudUpload()
        return createOk(result)
      }
      case MESSAGE_TYPES.SYNC_WITH_CLOUD: {
        const result = await syncCloudState()
        return createOk(result)
      }
      case MESSAGE_TYPES.SAVE_BACKEND_CONFIG: {
        const config = await saveBackendConfig(message.payload)
        return createOk({ config })
      }
      case MESSAGE_TYPES.GET_TRANSLATION_PROVIDER_STATUS: {
        const config = await getBackendConfig()
        const providers = await getTranslationProviderStatuses(config)
        return createOk({ providers })
      }
      case MESSAGE_TYPES.SAVE_TRANSLATION_PROVIDER_CONFIG: {
        const config = await getBackendConfig()
        const providers = await saveTranslationProviderConfig(config, message.payload)
        return createOk({ providers })
      }
      case MESSAGE_TYPES.DELETE_TRANSLATION_PROVIDER_CONFIG: {
        const config = await getBackendConfig()
        const providers = await deleteTranslationProviderConfig(config, message.payload.provider)
        return createOk({ providers })
      }
      default: {
        return createError('未知消息类型')
      }
    }
  } catch (error) {
    return createError(error instanceof Error ? error.message : '消息处理失败')
  }
}