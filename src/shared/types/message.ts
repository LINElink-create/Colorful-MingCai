import type { ExportFormat } from '../constants/exportFormats'
import type { AnnotationColor, ExportBundle, PageAnnotationBucket } from './annotation'
import type { BackendAccount } from './auth'
import type { CloudSyncState, CloudUploadPreview } from './sync'
import type {
  BackendConfig,
  TranslationProvider,
  TranslationProviderConfigInput,
  TranslationPreferences,
  TranslationProviderStatus,
  TranslationResult
} from './translation'

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
      // 在 content 端滚动并定位到指定 annotation
      type: 'NAVIGATE_TO_ANNOTATION'
      payload: { annotationId: string }
    }
  | {
      // 将当前选中文本发送给 background 执行翻译
      type: 'TRANSLATE_SELECTION'
      payload: { text: string; pageUrl?: string; pageTitle?: string }
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
      // 获取本地翻译偏好
      type: 'GET_TRANSLATION_PREFERENCES'
      payload: Record<string, never>
    }
  | {
      // 保存本地翻译偏好
      type: 'SAVE_TRANSLATION_PREFERENCES'
      payload: TranslationPreferences
    }
  | {
      // 获取后端连接配置
      type: 'GET_BACKEND_CONFIG'
      payload: Record<string, never>
    }
  | {
      // 注册后端账号
      type: 'REGISTER_BACKEND_ACCOUNT'
      payload: { email: string; password: string; displayName?: string }
    }
  | {
      // 登录后端账号
      type: 'LOGIN_BACKEND_ACCOUNT'
      payload: { email: string; password: string }
    }
  | {
      // 登出后端账号
      type: 'LOGOUT_BACKEND_ACCOUNT'
      payload: Record<string, never>
    }
  | {
      // 获取当前后端账号
      type: 'GET_BACKEND_ACCOUNT'
      payload: Record<string, never>
    }
  | {
      // 获取当前账号邮箱验证状态
      type: 'GET_ACCOUNT_VERIFICATION_STATUS'
      payload: Record<string, never>
    }
  | {
      // 发送或重发邮箱验证邮件
      type: 'SEND_VERIFICATION_EMAIL'
      payload: { email: string }
    }
  | {
      // 使用令牌确认邮箱验证
      type: 'VERIFY_EMAIL_TOKEN'
      payload: { token: string }
    }
  | {
      // 只拉取云端数据并更新本地，不执行上传
      type: 'PULL_CLOUD_STATE'
      payload: { automatic?: boolean }
    }
  | {
      // 构建本次上传的预览摘要，供用户确认
      type: 'PREVIEW_CLOUD_UPLOAD'
      payload: Record<string, never>
    }
  | {
      // 用户确认后执行上传
      type: 'CONFIRM_CLOUD_UPLOAD'
      payload: Record<string, never>
    }
  | {
      // 执行云同步
      type: 'SYNC_WITH_CLOUD'
      payload: { automatic?: boolean }
    }
  | {
      // 保存后端连接配置
      type: 'SAVE_BACKEND_CONFIG'
      payload: BackendConfig
    }
  | {
      // 获取远端翻译 provider 状态
      type: 'GET_TRANSLATION_PROVIDER_STATUS'
      payload: Record<string, never>
    }
  | {
      // 保存个人翻译 provider 配置
      type: 'SAVE_TRANSLATION_PROVIDER_CONFIG'
      payload: TranslationProviderConfigInput
    }
  | {
      // 删除个人翻译 provider 配置
      type: 'DELETE_TRANSLATION_PROVIDER_CONFIG'
      payload: { provider: TranslationProvider }
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

export type TranslationPreferencesResult = {
  preferences: TranslationPreferences
}

export type BackendConfigResult = {
  config: BackendConfig
}

export type BackendAccountResult = {
  account: BackendAccount | null
}

export type VerificationStatusResult = {
  account: BackendAccount | null
}

export type CloudSyncResult = CloudSyncState

export type CloudUploadPreviewResult = CloudUploadPreview

export type TranslationProviderStatusResult = {
  providers: TranslationProviderStatus[]
}