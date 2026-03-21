import browser from 'webextension-polyfill'
import type { ActivePageInfo } from '../../shared/types/page'

// Tabs 适配层：把浏览器 tabs API 收敛成项目需要的最小页面信息结构。
// Popup 不直接依赖原始 Tab 类型，这样更便于测试和后续替换实现。
export const getActivePageInfo = async (): Promise<ActivePageInfo> => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

  return {
    tabId: tab?.id ?? null,
    title: tab?.title ?? '',
    url: tab?.url ?? ''
  }
}

// 重新加载指定标签页，用于让页面在清空当前页高亮后立即按最新存储状态重绘。
export const reloadTabById = async (tabId: number) => {
  await browser.tabs.reload(tabId)
}