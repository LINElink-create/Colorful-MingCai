import type { AnnotationColor, AnnotationRecord } from '../../../shared/types/annotation'
import { DEFAULT_ANNOTATION_COLOR } from '../../../shared/constants/annotationColors'
import { createId } from '../../../shared/utils/id'
import { nowIsoString } from '../../../shared/utils/time'
import { normalizeUrlForStorage } from '../../../shared/utils/url'
import { serializeSelectionRange } from '../anchoring/serializeSelection'

export const createAnnotationFromRange = (
  range: Range,
  pageUrl: string,
  pageTitle: string,
  color: AnnotationColor = DEFAULT_ANNOTATION_COLOR,
  note = ''
): AnnotationRecord => {
  // 将 Range 序列化为可持久化的锚点信息（包含容器路径、偏移、文本片段等）
  const serializedSelection = serializeSelectionRange(range)
  // 记录创建/更新时间戳（ISO 格式），用于排序与展示
  const timestamp = nowIsoString()

  // 返回完整的 AnnotationRecord 域对象（尚未持久化）
  return {
    id: createId(), // 生成唯一 id
    url: normalizeUrlForStorage(pageUrl), // 归一化页面 URL 以便存储和查找
    pageTitle,
    color,
    note,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...serializedSelection // 包含 start/end 容器路径、offset、textQuote 等
  }
}