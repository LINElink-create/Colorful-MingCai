import { describe, expect, it } from 'vitest'
import { buildQuoteContext } from '../../../src/modules/annotations/anchoring/textQuote'

// 说明：该单元测试验证文本片段提取工具是否能正确返回选中文本及其前后上下文
describe('buildQuoteContext', () => {
  it('extracts quote and surrounding context', () => {
    // 输入字符串中选中了 'hello world'，分别位于索引 7 到 18
    const result = buildQuoteContext('before hello world after', 7, 18)

    // 断言提取出的主文本与前后上下文包含预期内容
    expect(result.textQuote).toBe('hello world')
    expect(result.prefixText).toContain('before')
    expect(result.suffixText).toContain('after')
  })
})