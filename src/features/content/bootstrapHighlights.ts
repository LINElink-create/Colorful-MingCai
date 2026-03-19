// bootstrapHighlights.ts 是一个模块，负责在页面加载时从存储中读取当前页面的注释分桶，并逐一在页面上恢复高亮显示
// 通过调用 getPageBucket 获取当前页面的注释分桶，然后遍历其中的注释并调用 restoreAnnotation 恢复高亮
import { getPageBucket } from '../../modules/annotations/repository/annotationRepository'
// restoreAnnotation 函数负责将单条注释记录转换为页面上的高亮元素，并插入到正确的位置
import { restoreAnnotation } from '../../modules/annotations/domain/restoreAnnotation'

export const bootstrapHighlights = async () => {
  // 从存储中读取当前页面的注释分桶并逐一在页面上恢复高亮
  const bucket = await getPageBucket(window.location.href)

  for (const annotation of bucket?.annotations ?? []) {
    restoreAnnotation(annotation)
  }
}