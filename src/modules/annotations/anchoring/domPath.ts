// DOM 路径工具：把一个 Node 转成“从 document.body 出发的 childNodes 下标路径”，
// 以便把 Range 的起止容器持久化到存储中，并在恢复时重新定位节点。
const getNodeIndex = (node: Node) => {
  if (!node.parentNode) {
    return 0
  }

  return Array.from(node.parentNode.childNodes).indexOf(node as ChildNode)
}

// 例：'0.3.2' 表示 body.childNodes[0].childNodes[3].childNodes[2]。
// 这类路径对轻微页面变动比较敏感，所以项目还配套了 textQuote 兜底恢复。
export const getNodePath = (node: Node) => {
  const segments: number[] = []
  let currentNode: Node | null = node

  while (currentNode && currentNode !== document.body) {
    segments.unshift(getNodeIndex(currentNode))
    currentNode = currentNode.parentNode
  }

  return segments.join('.')
}

// 按持久化后的路径重新查找节点。
// 找不到时返回 null，交由上层决定是否走文本匹配降级方案。
export const getNodeByPath = (path: string) => {
  const segments = path.split('.').filter(Boolean).map(Number)
  let currentNode: Node | null = document.body

  for (const segment of segments) {
    currentNode = currentNode?.childNodes.item(segment) ?? null
    if (!currentNode) {
      return null
    }
  }

  return currentNode
}