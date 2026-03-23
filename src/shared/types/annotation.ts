// 标注颜色枚举。
// 这些值会被持久化到 annotation 数据中，并在恢复时用于决定高亮外观。
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink'

// 单条标注记录的持久化结构，包含用于恢复高亮的锚点信息与元数据
export type AnnotationRecord = {
  id: string
  url: string
  pageTitle: string
  textQuote: string
  prefixText: string
  suffixText: string
  startContainerPath: string
  startOffset: number
  endContainerPath: string
  endOffset: number
  color: AnnotationColor
  note?: string
  createdAt: string
  updatedAt: string
}

// 按页面分桶存储的注释集合，便于按当前页面快速查询
export type PageAnnotationBucket = {
  url: string
  pageTitle: string
  annotations: AnnotationRecord[]
  updatedAt: string
  schemaVersion: number
}

// 导出/导入使用的数据包结构，包含所有分桶与导出时间/版本信息
export type ExportBundle = {
  schemaVersion: number
  exportedAt: string
  buckets: PageAnnotationBucket[]
}

// 导入模式：合并或替换当前存储
export type ImportMode = 'merge' | 'replace'