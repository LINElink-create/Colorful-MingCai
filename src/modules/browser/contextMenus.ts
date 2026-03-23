import browser from 'webextension-polyfill'

export const MENU_IDS = {
  highlightSelection: 'mingcai-highlight-selection',
  removeHighlightSelection: 'mingcai-remove-highlight-selection'
} as const

export const ensureContextMenu = async () => {
  await browser.contextMenus.removeAll()
  await browser.contextMenus.create({
    id: MENU_IDS.highlightSelection,
    title: '高亮选中文本',
    contexts: ['selection']
  })

  await browser.contextMenus.create({
    id: MENU_IDS.removeHighlightSelection,
    title: '取消选中区域高亮',
    contexts: ['selection']
  })
}