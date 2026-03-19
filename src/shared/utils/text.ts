// 将连续空白字符压缩为单个空格并去除首尾空白
export const trimWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

// 从给定字符串的 [start, end) 区间周围切出上下文片段
// 返回 prefixText 和 suffixText，用于在恢复或比对时做上下文校验
export const sliceAround = (value: string, start: number, end: number, contextLength = 32) => {
  return {
    prefixText: value.slice(Math.max(0, start - contextLength), start),
    suffixText: value.slice(end, Math.min(value.length, end + contextLength))
  }
}