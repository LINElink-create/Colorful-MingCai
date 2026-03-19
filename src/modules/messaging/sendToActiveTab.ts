import browser from 'webextension-polyfill'
import type { RuntimeMessage } from '../../shared/types/message'

export const sendMessageToTab = async (tabId: number, message: RuntimeMessage) => {
  // 向指定 tabId 的 content script 发送运行时消息
  // 由 webextension-polyfill 代理 browser.tabs.sendMessage，返回 Promise
  return browser.tabs.sendMessage(tabId, message)
}