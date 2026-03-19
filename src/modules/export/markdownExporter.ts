import type { ExportBundle } from '../../shared/types/annotation'

// Markdown 导出器：把结构化 annotation 数据转换成更适合阅读/整理的文本格式。
// 这里不追求无损，只保留页面级分组和摘录文本本身。
export const buildMarkdownExport = (bundle: ExportBundle) => {
  const lines: string[] = ['# 明彩导出', '']

  for (const bucket of bundle.buckets) {
    // 每个 bucket 对应一个页面分组，标题优先显示 pageTitle，缺省时回退为 URL。
    lines.push(`## ${bucket.pageTitle || bucket.url}`)
    lines.push(`- URL: ${bucket.url}`)
    lines.push(`- Updated At: ${bucket.updatedAt}`)
    lines.push('')

    for (const annotation of bucket.annotations) {
      // 当前版本只导出摘录正文，后续可以扩展颜色、备注、创建时间等字段。
      lines.push(`- ${annotation.textQuote}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}