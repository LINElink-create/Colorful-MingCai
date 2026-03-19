import { describe, expect, it } from 'vitest'
import { buildMarkdownExport } from '../../../src/modules/export/markdownExporter'

// 说明：测试 Markdown 导出器是否能将导出包渲染为包含标题与摘录列表的 Markdown 文本
describe('buildMarkdownExport', () => {
  it('renders headings and quotes', () => {
    const result = buildMarkdownExport({
      schemaVersion: 1,
      exportedAt: '2026-03-18T00:00:00.000Z',
      buckets: [
        {
          url: 'https://example.com',
          pageTitle: 'Example',
          updatedAt: '2026-03-18T00:00:00.000Z',
          schemaVersion: 1,
          annotations: [
            {
              id: '1',
              url: 'https://example.com',
              pageTitle: 'Example',
              textQuote: 'hello world',
              prefixText: '',
              suffixText: '',
              startContainerPath: '0',
              startOffset: 0,
              endContainerPath: '0',
              endOffset: 11,
              color: 'yellow',
              createdAt: '2026-03-18T00:00:00.000Z',
              updatedAt: '2026-03-18T00:00:00.000Z'
            }
          ]
        }
      ]
    })

    // 断言包含导出标题与注释摘录，确认渲染要素存在
    expect(result).toContain('# 明彩导出')
    expect(result).toContain('- hello world')
  })
})