import { describe, expect, it } from 'vitest'
import { buildJsonExport } from '../../../src/modules/export/jsonExporter'

// 说明：验证 JSON 导出器能把导出包序列化为包含 schemaVersion 字段的可读 JSON 字符串
describe('buildJsonExport', () => {
  it('serializes export bundle to formatted json', () => {
    const result = buildJsonExport({
      schemaVersion: 1,
      exportedAt: '2026-03-18T00:00:00.000Z',
      buckets: []
    })

    // 断言输出包含 schemaVersion 字段，确认序列化结构正确
    expect(result).toContain('"schemaVersion": 1')
  })
})