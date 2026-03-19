import { sliceAround, trimWhitespace } from '../../../shared/utils/text'

// 文本锚点工具：把一次选区抽象为“主文本 + 前后文”。
// 这类锚点比纯 DOM 路径更稳，因为页面结构变化时仍可能通过文本内容重新匹配。
export const buildQuoteContext = (fullText: string, start: number, end: number) => {
  // 先压缩空白，降低换行、多个空格导致的匹配偏差。
  const normalizedText = trimWhitespace(fullText)
  const quote = trimWhitespace(fullText.slice(start, end))
  // 对当前实现来说，调用方通常传入的就是选中文本本身，
  // 因此 normalizedStart 大多从 0 开始；保留这段逻辑是为了后续扩展到更大文本上下文时复用。
  const normalizedStart = normalizedText.indexOf(quote)
  const effectiveStart = normalizedStart >= 0 ? normalizedStart : start
  const effectiveEnd = effectiveStart + quote.length

  return {
    textQuote: quote,
    ...sliceAround(normalizedText, effectiveStart, effectiveEnd)
  }
}