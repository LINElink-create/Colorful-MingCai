import { removeRenderedAnnotation } from '../rendering/highlightRenderer'

// 从页面上移除指定 ID 的高亮渲染（但不删除存储中的数据）
export const removeAnnotationFromDocument = (annotationId: string) => {
  removeRenderedAnnotation(annotationId)
}