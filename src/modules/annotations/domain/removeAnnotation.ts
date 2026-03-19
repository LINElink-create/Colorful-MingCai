import { removeRenderedAnnotation } from '../rendering/highlightRenderer'

export const removeAnnotationFromDocument = (annotationId: string) => {
  removeRenderedAnnotation(annotationId)
}