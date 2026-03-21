import browser from 'webextension-polyfill'
import { defineBackground } from 'wxt/sandbox'
import { registerContextMenus } from '../src/features/background/registerMenus'
import { routeRuntimeMessage } from '../src/modules/messaging/messageRouter'
import { MENU_IDS } from '../src/modules/browser/contextMenus'
import { sendMessageToTab } from '../src/modules/messaging/sendToActiveTab'
import { MESSAGE_TYPES } from '../src/shared/constants/messageTypes'
import type { RuntimeMessage } from '../src/shared/types/message'

export default defineBackground(() => {
  // 扩展首次安装时触发：注册右键菜单
  browser.runtime.onInstalled.addListener(() => {
    // 注册上下文菜单（异步调用，忽略返回的 Promise）
    void registerContextMenus()
  })

  // 浏览器启动时触发：确保上下文菜单存在
  browser.runtime.onStartup.addListener(() => {
    // 重新注册上下文菜单，防止因浏览器重启导致菜单丢失
    void registerContextMenus()
  })

  // 监听右键菜单点击事件
  browser.contextMenus.onClicked.addListener((info: { menuItemId?: string | number }, tab?: { id?: number }) => {
    if (!tab?.id) {
      return
    }

    if (info.menuItemId === MENU_IDS.highlightSelection) {
      // 向指定 tab 发送创建标注的运行时消息（payload 包含高亮颜色）
      void sendMessageToTab(tab.id, {
        type: MESSAGE_TYPES.CREATE_ANNOTATION_FROM_SELECTION,
        payload: { color: 'yellow' }
      })
      return
    }

    if (info.menuItemId === MENU_IDS.removeHighlightSelection) {
      void sendMessageToTab(tab.id, {
        type: MESSAGE_TYPES.REMOVE_ANNOTATIONS_FROM_SELECTION,
        payload: {}
      })
    }
  })

  // 统一接收来自 content/popup 的运行时消息，并交给路由器处理
  browser.runtime.onMessage.addListener((message: unknown) => {
    return routeRuntimeMessage(message as RuntimeMessage)
  })
})