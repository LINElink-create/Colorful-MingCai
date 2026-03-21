// 这个工具函数用于标准化 URL，主要是移除 URL 中的 hash 部分。
export const normalizeUrlForStorage = (url: string) => {
  try {
    const parsedUrl = new URL(url)
    parsedUrl.hash = ''
    // 移除 hash 并返回标准化后的 URL，便于将同一页面不同锚点视为同一页面
    return parsedUrl.toString()
  } catch {
    return url
  }
}

