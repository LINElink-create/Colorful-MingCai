import browser from 'webextension-polyfill'
import { defineContentScript } from 'wxt/sandbox'
import { bootstrapHighlights } from '../src/features/content/bootstrapHighlights'
import { observeSelection } from '../src/features/content/observeSelection'
import { routeRuntimeMessage } from '../src/modules/messaging/messageRouter'
import { MESSAGE_TYPES } from '../src/shared/constants/messageTypes'
import type { AnnotationColor } from '../src/shared/types/annotation'
import type { RuntimeMessage } from '../src/shared/types/message'

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    // 页面加载完成后，先尝试恢复已有的高亮到页面中
    void bootstrapHighlights()

    // 启动选区监听器：用户划词后直接出现浮层，并可选择高亮颜色。
    observeSelection({
      onCreateAnnotation: async (color: AnnotationColor) => {
        await routeRuntimeMessage(
          {
            type: MESSAGE_TYPES.CREATE_ANNOTATION_FROM_SELECTION,
            payload: { color }
          },
          { source: 'content' }
        )
      }
    })

    // 监听来自 background/popup 的运行时消息，交由路由器处理
    // 指定 context.source = 'content' 表示处理逻辑运行在页面上下文中
    browser.runtime.onMessage.addListener((message: unknown) => {
      return routeRuntimeMessage(message as RuntimeMessage, { source: 'content' })
    })
  }
})