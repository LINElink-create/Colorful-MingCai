import { ensureHighlightStyle } from './highlightStyle'

const unwrapMarkElement = (element: Element) => {
  const parent = element.parentNode

  element
    .querySelectorAll('[data-mingcai-note-marker="true"]')
    .forEach((marker) => {
      marker.parentNode?.removeChild(marker)
    })

  // 把 mark 内部的文本片段重新“拆回”父节点，然后移除包裹 mark。
  while (element.firstChild) {
    parent?.insertBefore(element.firstChild, element)
  }

  parent?.removeChild(element)
}

// 检查页面上是否已经渲染了指定 ID 的高亮，避免重复渲染。
export const isAnnotationRendered = (annotationId: string) => {
  return document.querySelector(`mark[data-mingcai-id="${annotationId}"]`) !== null
}

// 清除页面上所有已渲染的高亮（但不删除存储中的数据），例如在导入新数据前或切换页面时调用。
export const clearAllRenderedAnnotations = () => {
  document
    .querySelectorAll('mark[data-mingcai-annotation="true"]')
    .forEach((element) => {
      unwrapMarkElement(element)
    })
}

// 移除已经渲染到 DOM 中的高亮节点。
// 做法是把 mark 内部的文本片段重新“拆回”父节点，然后移除包裹 mark。
export const removeRenderedAnnotation = (annotationId: string) => {
  document
    .querySelectorAll(`mark[data-mingcai-id="${annotationId}"]`)
    .forEach((element) => {
      unwrapMarkElement(element)
    })
}

// 把一个 Range 包裹为 mark 节点并写入 annotation 标识。
// 这里采用 extractContents + insertNode 的方式，便于后续按 annotationId 精确找到对应的高亮片段。
export const renderAnnotationRange = (range: Range, annotationId: string, color = 'yellow', note = '') => {
  ensureHighlightStyle()

  if (isAnnotationRendered(annotationId)) {
    return
  }

  const mark = document.createElement('mark')
  mark.dataset.mingcaiAnnotation = 'true'
  mark.dataset.mingcaiId = annotationId
  mark.dataset.mingcaiColor = color
  mark.dataset.mingcaiHasNote = note ? 'true' : 'false'

  if (note) {
    mark.dataset.mingcaiNote = note
  }

  const fragment = range.extractContents()

  if (note) {
    const noteMarker = document.createElement('button')
    noteMarker.type = 'button'
    noteMarker.dataset.mingcaiNoteMarker = 'true'
    noteMarker.dataset.mingcaiAnnotationId = annotationId
    noteMarker.setAttribute('aria-label', '查看这段划词的笔记')
    noteMarker.textContent = '注'
    mark.append(noteMarker)
  }

  mark.append(fragment)
  range.insertNode(mark)
}