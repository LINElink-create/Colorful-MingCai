import type { PageAnnotationBucket } from '../../shared/types/annotation'
import { MESSAGE_TYPES } from '../../shared/constants/messageTypes'
import { sendMessageToBackground } from '../../modules/messaging/sendToBackground'

// Popup 场景专用的数据读取函数。
// 它只负责“按 URL 向 background 要当前页 bucket”，不处理任何 UI 状态。
export const loadCurrentPageAnnotations = async (url: string) => {
  const result = await sendMessageToBackground<{ bucket: PageAnnotationBucket | null }>({
    type: MESSAGE_TYPES.GET_CURRENT_PAGE_ANNOTATIONS,
    payload: { url }
  })

  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.data.bucket
}