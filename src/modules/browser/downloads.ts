import browser from 'webextension-polyfill'

// 下载适配层：把一段文本包装成 data URL，并通过浏览器下载 API 触发保存。
// 当前导出功能的真正落地点就在这里。
export const downloadTextFile = async (filename: string, content: string, mimeType = 'text/plain;charset=utf-8') => {
  const dataUrl = `data:${mimeType},${encodeURIComponent(content)}`

  await browser.downloads.download({
    filename,
    saveAs: true,
    url: dataUrl
  })
}