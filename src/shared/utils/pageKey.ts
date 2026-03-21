// 生成用于存储的页面键，格式为 origin + pathname，忽略查询参数和 hash  
export const getPageKey = (url: string) => {
  const u = new URL(url)
  return `${u.origin}${u.pathname}`
}