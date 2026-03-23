import browser from 'webextension-polyfill'
import type { ActivePageInfo } from '../../shared/types/page'
import { getPageKey } from '../../shared/utils/pageKey'

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

// 在新标签页中打开任意 URL，供 Popup 或扩展页跳转使用。
export const openTab = async (url: string) => {
  await browser.tabs.create({ url })
}

// 打开扩展内部页面，例如历史总览页。
export const openExtensionPage = async (path: string) => {
  await openTab(browser.runtime.getURL(path))
}

// 查找当前浏览器中与指定页面 key 对应的所有 tab。
// 这里按 origin + pathname 匹配，和项目里的高亮存储策略保持一致。
export const findTabIdsByPageUrl = async (url: string) => {
  const targetPageKey = getPageKey(url)
  const tabs = await browser.tabs.query({})

  return tabs
    .filter((tab) => {
      if (!tab.id || !tab.url) {
        return false
      }

      try {
        return getPageKey(tab.url) === targetPageKey
      } catch {
        return false
      }
    })
    .map((tab) => tab.id as number)
}