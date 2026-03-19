// Range 规范化器：在真正创建 annotation 之前，先过滤掉明显无效的 Range。
// 当前规则很轻，只做“非空 + 在 document.body 内”两项校验。
export const normalizeRange = (range: Range) => {
  if (!range || range.collapsed) {
    return null
  }

  // 防止 Range 指向已被移除的节点，或不在当前正文区域中的节点。
  if (!document.body.contains(range.commonAncestorContainer)) {
    return null
  }

  return range.cloneRange()
}