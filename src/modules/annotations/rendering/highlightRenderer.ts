import { ensureHighlightStyle } from './highlightStyle'

// 移除已经渲染到 DOM 中的高亮节点。
// 做法是把 mark 内部的文本片段重新“拆回”父节点，然后移除包裹 mark。
export const removeRenderedAnnotation = (annotationId: string) => {
  document
    .querySelectorAll(`mark[data-mingcai-id="${annotationId}"]`)
    .forEach((element) => {
      const parent = element.parentNode
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element)
      }
      parent?.removeChild(element)
    })
}

// 把一个 Range 包裹为 mark 节点并写入 annotation 标识。
// 这里采用 extractContents + insertNode 的方式，便于后续按 annotationId 精确找到对应的高亮片段。
export const renderAnnotationRange = (range: Range, annotationId: string, color = 'yellow') => {
  ensureHighlightStyle()

  const mark = document.createElement('mark')
  mark.dataset.mingcaiAnnotation = 'true'
  mark.dataset.mingcaiId = annotationId
  mark.dataset.mingcaiColor = color

  const fragment = range.extractContents()
  mark.append(fragment)
  range.insertNode(mark)
}