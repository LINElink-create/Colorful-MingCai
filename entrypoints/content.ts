import browser from 'webextension-polyfill'
import { defineContentScript } from 'wxt/sandbox'
import { bootstrapHighlights } from '../src/features/content/bootstrapHighlights'
import { observeSelection } from '../src/features/content/observeSelection'
import { sendMessageToBackground } from '../src/modules/messaging/sendToBackground'
import { routeRuntimeMessage } from '../src/modules/messaging/messageRouter'
import { DEFAULT_ANNOTATION_COLOR } from '../src/shared/constants/annotationColors'
import { MESSAGE_TYPES } from '../src/shared/constants/messageTypes'
import type { AnnotationColor } from '../src/shared/types/annotation'
import type { RuntimeMessage, TranslationResultPayload } from '../src/shared/types/message'
import { createAnnotationFromRange } from '../src/modules/annotations/domain/createAnnotation'
import { getPageKey } from '../src/shared/utils/pageKey'
import { normalizeRange } from '../src/modules/annotations/rendering/rangeNormalizer'
import { saveAnnotation } from '../src/modules/annotations/repository/annotationRepository'
import { restoreAnnotation } from '../src/modules/annotations/domain/restoreAnnotation'

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
      },
      onCreateNote: async (range: Range, note: string) => {
        const normalizedRange = normalizeRange(range)

        if (!normalizedRange) {
          throw new Error('当前没有可高亮的有效选区')
        }

        const annotation = createAnnotationFromRange(
          normalizedRange,
          getPageKey(window.location.href),
          document.title,
          DEFAULT_ANNOTATION_COLOR,
          note
        )

        const restored = restoreAnnotation(annotation)
        if (!restored) {
          throw new Error('无法在当前页面渲染这条笔记标注')
        }

        await saveAnnotation(annotation)
        window.getSelection()?.removeAllRanges()
      },
      onTranslateSelection: async (text: string) => {
        const result = await sendMessageToBackground<TranslationResultPayload>({
          type: MESSAGE_TYPES.TRANSLATE_SELECTION,
          payload: { text }
        })

        if (!result.ok) {
          throw new Error(result.error)
        }

        return result.data.result
      }
    })

    // 监听来自 background/popup 的运行时消息，交由路由器处理
    // 指定 context.source = 'content' 表示处理逻辑运行在页面上下文中
    browser.runtime.onMessage.addListener((message: unknown) => {
      return routeRuntimeMessage(message as RuntimeMessage, { source: 'content' })
    })
  }
})