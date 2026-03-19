import browser from 'webextension-polyfill'
import type { RuntimeMessage, RuntimeMessageResult } from '../../shared/types/message'

// Popup 等非页面上下文通过这个适配层向 background 发消息。
// 这里统一返回 RuntimeMessageResult<TData>，让上层只关心 ok/data/error 结构。
export const sendMessageToBackground = async <TData>(message: RuntimeMessage) => {
  return browser.runtime.sendMessage(message) as Promise<RuntimeMessageResult<TData>>
}