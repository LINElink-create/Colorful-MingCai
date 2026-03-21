import type { AnnotationRecord } from '../../../shared/types/annotation'
import { resolveAnnotationRange } from '../anchoring/resolveAnchor'
import { isAnnotationRendered, renderAnnotationRange } from '../rendering/highlightRenderer'

export const restoreAnnotation = (annotation: AnnotationRecord) => {
  if (isAnnotationRendered(annotation.id)) {
    return true
  }

  // 根据 annotation 中保存的锚点信息还原为页面上的 Range
  const range = resolveAnnotationRange(annotation)

  // 无法解析到 Range（例如 DOM 结构已变更或文本不匹配），则返回 false
  if (!range) {
    return false
  }

  // 渲染高亮到页面上（传入 id 以便后续可通过 id 找到并移除）
  renderAnnotationRange(range, annotation.id, annotation.color)
  return true
}