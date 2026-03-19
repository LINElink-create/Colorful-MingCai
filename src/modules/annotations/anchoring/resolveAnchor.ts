import type { AnnotationRecord } from '../../../shared/types/annotation'
import { getNodeByPath } from './domPath'

// 第一优先级：使用持久化时保存的 DOM 路径 + offset 直接还原 Range。
// 优点是精度高；缺点是页面结构变化后容易失效。
const createRangeFromPaths = (annotation: AnnotationRecord) => {
  const startContainer = getNodeByPath(annotation.startContainerPath)
  const endContainer = getNodeByPath(annotation.endContainerPath)

  if (!startContainer || !endContainer) {
    return null
  }

  const range = document.createRange()

  try {
    range.setStart(startContainer, annotation.startOffset)
    range.setEnd(endContainer, annotation.endOffset)
    if (range.toString().trim()) {
      return range
    }
  } catch {
    return null
  }

  return null
}

// 扫描页面中所有非空文本节点，为文本匹配恢复做准备。
const findTextNodes = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let currentNode = walker.nextNode()

  while (currentNode) {
    if (currentNode.textContent?.trim()) {
      nodes.push(currentNode as Text)
    }
    currentNode = walker.nextNode()
  }

  return nodes
}

// 第二优先级：根据 textQuote 在文本节点中查找并重建 Range。
// 当前版本只做最简单的单节点文本匹配，后续可以升级为“主文本 + 前后文”的混合校验。
const createRangeFromQuote = (annotation: AnnotationRecord) => {
  const textNodes = findTextNodes()

  for (const textNode of textNodes) {
    const content = textNode.textContent ?? ''
    const index = content.indexOf(annotation.textQuote)
    if (index < 0) {
      continue
    }

    const range = document.createRange()
    range.setStart(textNode, index)
    range.setEnd(textNode, index + annotation.textQuote.length)
    return range
  }

  return null
}

// 统一的恢复入口：先走精确的路径恢复，失败后再走文本匹配降级。
export const resolveAnnotationRange = (annotation: AnnotationRecord) => {
  return createRangeFromPaths(annotation) ?? createRangeFromQuote(annotation)
}