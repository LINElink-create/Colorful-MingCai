// 当前活动页面信息（由 tabs 模块提供，用于 popup 展示与操作定位）
export type ActivePageInfo = {
  tabId: number | null
  title: string
  url: string
}