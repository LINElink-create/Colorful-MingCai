import browser from 'webextension-polyfill'
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS } from '../../../shared/constants/storageKeys'
import type { AnnotationColor, AnnotationRecord, ExportBundle, ImportMode, PageAnnotationBucket } from '../../../shared/types/annotation'
import { nowIsoString } from '../../../shared/utils/time'
import { normalizeUrlForStorage } from '../../../shared/utils/url'

type BucketMap = Record<string, PageAnnotationBucket>

type StoredAnnotationRecord = AnnotationRecord & {
  highlight?: { enabled?: boolean; color?: AnnotationColor }
  notes?: Array<{ content?: string }>
  anchorKey?: string
}

type StoredPageAnnotationBucket = PageAnnotationBucket & {
  annotations?: StoredAnnotationRecord[]
}

const normalizeStoredAnnotation = (annotation: StoredAnnotationRecord): AnnotationRecord => {
  const noteFromNotes = annotation.notes?.map((item) => item.content?.trim() ?? '').filter(Boolean).at(-1)
  const normalizedNote = annotation.note?.trim() || noteFromNotes || undefined

  return {
    id: annotation.id,
    url: annotation.url,
    pageTitle: annotation.pageTitle,
    textQuote: annotation.textQuote,
    prefixText: annotation.prefixText,
    suffixText: annotation.suffixText,
    startContainerPath: annotation.startContainerPath,
    startOffset: annotation.startOffset,
    endContainerPath: annotation.endContainerPath,
    endOffset: annotation.endOffset,
    color: annotation.color ?? annotation.highlight?.color ?? 'yellow',
    note: normalizedNote,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt
  }
}

const normalizeBucketMap = (rawBucketMap: unknown): BucketMap => {
  const source = (rawBucketMap as Record<string, StoredPageAnnotationBucket> | undefined) ?? {}
  const nextBucketMap: BucketMap = {}

  for (const [bucketKey, bucket] of Object.entries(source)) {
    nextBucketMap[bucketKey] = {
      url: bucket.url,
      pageTitle: bucket.pageTitle,
      annotations: (bucket.annotations ?? []).map((annotation) => normalizeStoredAnnotation(annotation)),
      updatedAt: bucket.updatedAt,
      schemaVersion: CURRENT_SCHEMA_VERSION
    }
  }

  return nextBucketMap
}

const readBucketMap = async (): Promise<BucketMap> => {
  // 从浏览器本地存储读取整个页面注释分桶映射（key -> PageAnnotationBucket）
  const stored = await browser.storage.local.get([STORAGE_KEYS.pageBuckets, STORAGE_KEYS.schemaVersion])
  const storedSchemaVersion = stored[STORAGE_KEYS.schemaVersion] as number | undefined
  const normalizedBucketMap = normalizeBucketMap(stored[STORAGE_KEYS.pageBuckets])

  if (storedSchemaVersion !== CURRENT_SCHEMA_VERSION) {
    await writeBucketMap(normalizedBucketMap)
  }

  return normalizedBucketMap
}

const writeBucketMap = async (bucketMap: BucketMap) => {
  // 将整个分桶映射写回本地存储，同时写入当前 schema 版本以便未来迁移
  await browser.storage.local.set({
    [STORAGE_KEYS.pageBuckets]: bucketMap,
    [STORAGE_KEYS.schemaVersion]: CURRENT_SCHEMA_VERSION
  })
}

const createEmptyBucket = (url: string, pageTitle: string): PageAnnotationBucket => ({
  // 创建一个空的页面注释分桶（用于首次写入或替换）
  url,
  pageTitle,
  annotations: [],
  updatedAt: nowIsoString(),
  schemaVersion: CURRENT_SCHEMA_VERSION
})

export const getPageBucket = async (url: string) => {
  // 读取分桶映射并返回指定页面的 bucket（或 null）
  const bucketMap = await readBucketMap()
  return bucketMap[normalizeUrlForStorage(url)] ?? null
}

export const saveAnnotation = async (annotation: AnnotationRecord) => {
  // 保存或更新一个 annotation 到对应页面的 bucket
  const bucketMap = await readBucketMap()
  const bucketKey = normalizeUrlForStorage(annotation.url)
  // 若目标 bucket 不存在则创建空的 bucket
  const bucket = bucketMap[bucketKey] ?? createEmptyBucket(annotation.url, annotation.pageTitle)
  // 去重：移除与当前 annotation 相同 id 的旧记录，再把新的压入数组末尾
  const nextAnnotations = bucket.annotations.filter((item) => item.id !== annotation.id)
  nextAnnotations.push(annotation)

  // 更新分桶信息并写回存储
  bucketMap[bucketKey] = {
    ...bucket,
    pageTitle: annotation.pageTitle,
    annotations: nextAnnotations,
    updatedAt: nowIsoString()
  }

  await writeBucketMap(bucketMap)
  return bucketMap[bucketKey]
}

export const clearPageAnnotations = async (url: string) => {
  // 删除指定页面的分桶并写回存储
  const bucketMap = await readBucketMap()
  delete bucketMap[normalizeUrlForStorage(url)]
  await writeBucketMap(bucketMap)
}

export const removeAnnotationsByIds = async (url: string, annotationIds: string[]) => {
  if (annotationIds.length === 0) {
    return null
  }

  const bucketMap = await readBucketMap()
  const bucketKey = normalizeUrlForStorage(url)
  const bucket = bucketMap[bucketKey]

  if (!bucket) {
    return null
  }

  const annotationIdSet = new Set(annotationIds)
  const nextAnnotations = bucket.annotations.filter((annotation) => !annotationIdSet.has(annotation.id))

  if (nextAnnotations.length === 0) {
    delete bucketMap[bucketKey]
    await writeBucketMap(bucketMap)
    return null
  }

  bucketMap[bucketKey] = {
    ...bucket,
    annotations: nextAnnotations,
    updatedAt: nowIsoString()
  }

  await writeBucketMap(bucketMap)
  return bucketMap[bucketKey]
}

export const listPageBuckets = async () => {
  // 返回按更新时间降序排列的所有分桶列表，便于在 UI 中按最近使用排序显示
  const bucketMap = await readBucketMap()
  return Object.values(bucketMap).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export const exportAnnotationBundle = async (): Promise<ExportBundle> => {
  // 导出整个注释数据包，包含 schemaVersion 与导出时间
  const buckets = await listPageBuckets()
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: nowIsoString(),
    buckets
  }
}

export const importAnnotationBundle = async (bundle: ExportBundle, mode: ImportMode = 'merge') => {
  // 根据导入模式决定是合并还是替换当前存储
  const currentBucketMap = mode === 'replace' ? {} : await readBucketMap()

  // 将导入包中的每个分桶写入到当前映射中，覆盖同 url 的数据
  for (const bucket of bundle.buckets) {
    currentBucketMap[normalizeUrlForStorage(bucket.url)] = {
      ...bucket,
      annotations: (bucket.annotations ?? []).map((annotation) => normalizeStoredAnnotation(annotation as StoredAnnotationRecord)),
      schemaVersion: CURRENT_SCHEMA_VERSION
    }
  }

  await writeBucketMap(currentBucketMap)
}