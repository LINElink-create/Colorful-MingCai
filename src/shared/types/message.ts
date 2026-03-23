import type { ExportFormat } from '../constants/exportFormats'
import type { AnnotationColor, ExportBundle, PageAnnotationBucket } from './annotation'
import type { TranslationResult, TranslationSettings } from './translation'

// 运行时消息协议：用于 popup/background/content 之间的强类型通信
export type RuntimeMessage =
  | {
      // 获取指定页面的注释分桶
      type: 'GET_CURRENT_PAGE_ANNOTATIONS'
      payload: { url: string }
    }
  | {
      // 在 content 端基于当前选区创建注释
      type: 'CREATE_ANNOTATION_FROM_SELECTION'
      payload: { color?: AnnotationColor; note?: string }
    }
  | {
      // 将当前选中文本发送给 background 执行翻译
      type: 'TRANSLATE_SELECTION'
      payload: { text: string }
    }
  | {
      // 在 content 端按 annotationId 删除单条高亮
      type: 'REMOVE_ANNOTATION_BY_ID'
      payload: { annotationId: string }
    }
  | {
      // 在 content 端基于当前选区移除已经存在的高亮
      type: 'REMOVE_ANNOTATIONS_FROM_SELECTION'
      payload: Record<string, never>
    }
  | {
      // 清空指定页面的注释分桶
      type: 'CLEAR_CURRENT_PAGE_ANNOTATIONS'
      payload: { url: string }
    }
  | {
      // 导出注释，payload 指定格式
      type: 'EXPORT_ANNOTATIONS'
      payload: { format: ExportFormat }
    }
  | {
      // 从文本导入注释包，mode 可选合并或替换
      type: 'IMPORT_ANNOTATIONS'
      payload: { rawText: string; mode?: 'merge' | 'replace' }
    }
  | {
      // 恢复指定页面的注释（用于 content 端）
      type: 'RESTORE_PAGE_ANNOTATIONS'
      payload: { url: string }
    }
  | {
      // 获取翻译配置
      type: 'GET_TRANSLATION_SETTINGS'
      payload: Record<string, never>
    }
  | {
      // 保存翻译配置
      type: 'SAVE_TRANSLATION_SETTINGS'
      payload: TranslationSettings
    }

// 运行时消息的统一返回结构：要么 ok 并携带 data，要么 ok=false 并携带错误信息
export type RuntimeMessageResult<TData = void> =
  | { ok: true; data: TData }
  | { ok: false; error: string }

// 导出结果信息（文件名与导出的分桶数量）
export type ExportResult = {
  filename: string
  count: number
}

// 获取当前页注释的返回结果结构
export type CurrentPageAnnotationsResult = {
  bucket: PageAnnotationBucket | null
}

// 导入结果（包含导入后的包结构与导入到的分桶数量）
export type ImportResult = {
  bundle: ExportBundle
  importedBucketCount: number
}

export type TranslationResultPayload = {
  result: TranslationResult
}

export type TranslationSettingsResult = {
  settings: TranslationSettings
}