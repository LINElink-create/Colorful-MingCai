import type { AnnotationRecord } from '../../../shared/types/annotation'
import { getNodeByPath } from './domPath'

type TextNodeSegment = {
  node: Text
  start: number
  end: number
}

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

const collectTextNodeSegments = () => {
  const textNodes = findTextNodes()
  const segments: TextNodeSegment[] = []
  let offset = 0

  for (const textNode of textNodes) {
    const content = textNode.textContent ?? ''
    const start = offset
    offset += content.length
    segments.push({
      node: textNode,
      start,
      end: offset
    })
  }

  return {
    segments,
    rawText: textNodes.map((node) => node.textContent ?? '').join('')
  }
}

const normalizeTextWithMap = (rawText: string) => {
  let normalizedText = ''
  const normalizedToRaw: number[] = []
  let lastWasWhitespace = false

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index] ?? ''
    const isWhitespace = /\s/.test(char)

    if (isWhitespace) {
      if (normalizedText.length === 0 || lastWasWhitespace) {
        continue
      }

      normalizedText += ' '
      normalizedToRaw.push(index)
      lastWasWhitespace = true
      continue
    }

    normalizedText += char
    normalizedToRaw.push(index)
    lastWasWhitespace = false
  }

  return { normalizedText, normalizedToRaw }
}

const scoreQuoteCandidate = (normalizedText: string, annotation: AnnotationRecord, start: number, end: number) => {
  let score = 0
  const prefixText = annotation.prefixText.trim()
  const suffixText = annotation.suffixText.trim()

  if (prefixText) {
    const before = normalizedText.slice(Math.max(0, start - prefixText.length), start)
    if (before.endsWith(prefixText)) {
      score += 4
    } else if (before.includes(prefixText.slice(-Math.min(prefixText.length, 16)))) {
      score += 2
    }
  }

  if (suffixText) {
    const after = normalizedText.slice(end, end + suffixText.length)
    if (after.startsWith(suffixText)) {
      score += 4
    } else if (after.includes(suffixText.slice(0, Math.min(suffixText.length, 16)))) {
      score += 2
    }
  }

  return score
}

// const locateSegmentPosition = (segments: TextNodeSegment[], rawOffset: number) => {
//   for (const segment of segments) {
//     if (rawOffset < segment.start) {
//       continue
//     }

//     if (rawOffset < segment.end) {
//       return {
//         node: segment.node,
//         offset: rawOffset - segment.start
//       }
//     }

//     if (rawOffset === segment.end) {
//       return {
//         node: segment.node,
//         offset: segment.end - segment.start
//       }
//     }
//   }

//   const lastSegment = segments[segments.length - 1]
//   if (!lastSegment) {
//     return null
//   }

//   return {
//     node: lastSegment.node,
//     offset: lastSegment.end - lastSegment.start
//   }
// }

// locateSegmentPosition 已经被 locateStartPosition 和 locateEndPosition 分拆，以更细粒度地处理边界情况。
const locateStartPosition = (segments: TextNodeSegment[], rawOffset: number) => {
  for (const segment of segments) {
    if (rawOffset < segment.start) {
      continue
    }

    if (rawOffset < segment.end) {
      return {
        node: segment.node,
        offset: rawOffset - segment.start
      }
    }

    // start 边界命中 segment.end 时，应该交给下一个 segment 的 start
    if (rawOffset === segment.end) {
      continue
    }
  }

  const lastSegment = segments[segments.length - 1]
  if (!lastSegment) {
    return null
  }

  return {
    node: lastSegment.node,
    offset: lastSegment.end - lastSegment.start
  }
}

// end 边界命中 segment.end 时，落在当前节点末尾是合理的
const locateEndPosition = (segments: TextNodeSegment[], rawOffset: number) => {
  for (const segment of segments) {
    if (rawOffset < segment.start) {
      continue
    }

    if (rawOffset < segment.end) {
      return {
        node: segment.node,
        offset: rawOffset - segment.start
      }
    }

    // end 边界命中 segment.end 时，落在当前节点末尾是合理的
    if (rawOffset === segment.end) {
      return {
        node: segment.node,
        offset: segment.end - segment.start
      }
    }
  }

  const lastSegment = segments[segments.length - 1]
  if (!lastSegment) {
    return null
  }

  return {
    node: lastSegment.node,
    offset: lastSegment.end - lastSegment.start
  }
}

// 第一优先级：根据持久化的 DOM 路径和 offset 直接尝试还原 Range。
const createRangeFromRawOffsets = (segments: TextNodeSegment[], rawStart: number, rawEnd: number) => {
  const startPosition = locateStartPosition(segments, rawStart)
  const endPosition = locateEndPosition(segments, rawEnd)

  if (!startPosition || !endPosition) {
    return null
  }

  const range = document.createRange()

  try {
    range.setStart(startPosition.node, startPosition.offset)
    range.setEnd(endPosition.node, endPosition.offset)

console.log('[resolved-range]', {
    rawStart,
    rawEnd,
    startNode: startPosition.node.textContent,
    startOffset: startPosition.offset,
    endNode: endPosition.node.textContent,
    endOffset: endPosition.offset,
    text: range.toString()
  })

    return range.toString().trim() ? range : null
  } catch {
    return null
  }
}

// 第二优先级：根据 textQuote 在文本节点中查找并重建 Range。
// 这里会把整页文本展平成一个连续字符串，并结合 prefix/suffix 对多个候选位置打分。
const createRangeFromQuote = (annotation: AnnotationRecord) => {
  const { segments, rawText } = collectTextNodeSegments()
  const { normalizedText, normalizedToRaw } = normalizeTextWithMap(rawText)
  const quote = annotation.textQuote.trim()

  if (!quote || !normalizedText) {
    return null
  }

  const candidates: Array<{ start: number; end: number; score: number }> = []
  let searchStart = 0

  while (searchStart < normalizedText.length) {
    const index = normalizedText.indexOf(quote, searchStart)
    if (index < 0) {
      break
    }

    const end = index + quote.length
    candidates.push({
      start: index,
      end,
      score: scoreQuoteCandidate(normalizedText, annotation, index, end)
    })
    searchStart = index + 1
  }

  const bestCandidate = candidates.sort((left, right) => right.score - left.score)[0]
  if (!bestCandidate) {
    return null
  }

  const rawStart = normalizedToRaw[bestCandidate.start]
  const rawEnd = bestCandidate.end < normalizedToRaw.length ? normalizedToRaw[bestCandidate.end] : rawText.length

  if (rawStart === undefined || rawEnd === undefined || rawEnd < rawStart) {
    return null
  }

  return createRangeFromRawOffsets(segments, rawStart, rawEnd)
}

// 统一的恢复入口：先走精确的路径恢复，失败后再走文本匹配降级。
export const resolveAnnotationRange = (annotation: AnnotationRecord) => {
  return createRangeFromPaths(annotation) ?? createRangeFromQuote(annotation)
}