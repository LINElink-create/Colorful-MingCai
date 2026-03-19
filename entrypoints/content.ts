import browser from 'webextension-polyfill'
import { defineContentScript } from 'wxt/sandbox'
import { bootstrapHighlights } from '../src/features/content/bootstrapHighlights'
import { observeSelection } from '../src/features/content/observeSelection'
import { routeRuntimeMessage } from '../src/modules/messaging/messageRouter'
import type { RuntimeMessage } from '../src/shared/types/message'

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    // 页面加载完成后，先尝试恢复已有的高亮到页面中
    void bootstrapHighlights()

    // 启动选区监听器，用于捕获用户划词并在适当时触发创建注释的流程
    observeSelection()

    // 监听来自 background/popup 的运行时消息，交由路由器处理
    // 指定 context.source = 'content' 表示处理逻辑运行在页面上下文中
    browser.runtime.onMessage.addListener((message: unknown) => {
      return routeRuntimeMessage(message as RuntimeMessage, { source: 'content' })
    })
  }
})