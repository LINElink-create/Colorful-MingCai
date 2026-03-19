// 导出格式常量：统一约束 popup、messageRouter 与 exporter 之间使用的格式标识。
// 这样可以避免在多个模块里直接写字符串字面量，降低拼写错误和后续重构成本。
export const EXPORT_FORMATS = {
  JSON: 'json',
  MARKDOWN: 'markdown'
} as const

// ExportFormat 会被推导为 'json' | 'markdown'，用于类型安全地约束导出参数。
export type ExportFormat = (typeof EXPORT_FORMATS)[keyof typeof EXPORT_FORMATS]