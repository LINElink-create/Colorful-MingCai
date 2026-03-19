import { getPageBucket } from '../../modules/annotations/repository/annotationRepository'
import { restoreAnnotation } from '../../modules/annotations/domain/restoreAnnotation'

export const bootstrapHighlights = async () => {
  // 从存储中读取当前页面的注释分桶并逐一在页面上恢复高亮
  const bucket = await getPageBucket(window.location.href)

  for (const annotation of bucket?.annotations ?? []) {
    restoreAnnotation(annotation)
  }
}