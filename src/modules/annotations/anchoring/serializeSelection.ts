import { getNodePath } from './domPath'
import { buildQuoteContext } from './textQuote'

// SerializedSelection 是 Range 的可持久化表示。
// 它保留了两类信息：
// 1. DOM 定位信息：容器路径和 offset
// 2. 文本定位信息：选中文本和前后文
export type SerializedSelection = {
  textQuote: string
  prefixText: string
  suffixText: string
  startContainerPath: string
  startOffset: number
  endContainerPath: string
  endOffset: number
}

// 把浏览器的 Range 转成可存储结构。
// 当前实现优先保存选区文本本身和 DOM 路径，为后续恢复提供双重依据。
export const serializeSelectionRange = (range: Range): SerializedSelection => {
  const selectionText = range.toString()

// 👉 获取整页文本
const fullText = document.body.innerText

// 👉 找选区在整页中的位置
const startIndex = fullText.indexOf(selectionText)

let prefixText = ''
let suffixText = ''

if (startIndex !== -1) {
  const endIndex = startIndex + selectionText.length

  prefixText = fullText.slice(Math.max(0, startIndex - 50), startIndex)
  suffixText = fullText.slice(endIndex, endIndex + 50)
}

const textQuote = selectionText

console.log('[annotation]', {
  textQuote,
  prefixText,
  suffixText
})

  return {
    textQuote,
    prefixText,
    suffixText,
    startContainerPath: getNodePath(range.startContainer),
    startOffset: range.startOffset,
    endContainerPath: getNodePath(range.endContainer),
    endOffset: range.endOffset
  }
}

// 从当前页面 Selection 中拿到一个可安全使用的克隆 Range。
// 这个工具更适合给 UI 或未来悬浮工具条调用；当前主链路主要通过 messageRouter 直接读取选区。
export const getCurrentSelectionRange = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    return null
  }

  return range.cloneRange()
}