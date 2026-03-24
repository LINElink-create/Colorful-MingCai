import { ANNOTATION_COLORS } from '../../shared/constants/annotationColors'
import type { AnnotationColor } from '../../shared/types/annotation'
import type { TranslationResult } from '../../shared/types/translation'

// type ObserveSelectionOptions = {
//   onCreateAnnotation: (color: AnnotationColor) => Promise<void> | void
//   onCreateNote: (note: string) => Promise<void> | void
//   onTranslateSelection: (text: string) => Promise<TranslationResult>
// }
type ObserveSelectionOptions = {
  onCreateAnnotation: (color: AnnotationColor) => Promise<void> | void
  onCreateNote: (range: Range, note: string) => Promise<void> | void
  onTranslateSelection: (text: string) => Promise<TranslationResult>
}


const TOOLBAR_ID = 'mingcai-selection-toolbar'
const PANEL_ID = 'mingcai-translation-panel'
const NOTE_PANEL_ID = 'mingcai-note-panel'
const SAVED_NOTE_PANEL_ID = 'mingcai-saved-note-panel'

const TOOLBAR_OFFSET_Y = 14
const PANEL_OFFSET_Y = 12

type PanelElements = {
  panel: HTMLDivElement
  status: HTMLParagraphElement
  body: HTMLParagraphElement
  meta: HTMLParagraphElement
  copyButton: HTMLButtonElement
}

type NotePanelElements = {
  panel: HTMLDivElement
  textarea: HTMLTextAreaElement
  saveButton: HTMLButtonElement
  cancelButton: HTMLButtonElement
  status: HTMLParagraphElement
}

type SavedNotePanelElements = {
  panel: HTMLDivElement
  title: HTMLParagraphElement
  body: HTMLParagraphElement
  closeButton: HTMLButtonElement
}

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.append(textarea)
  textarea.select()

  const succeeded = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!succeeded) {
    throw new Error('当前页面不支持复制到剪贴板')
  }
}

const scheduleFrame = (callback: () => void) => {
  window.requestAnimationFrame(() => {
    window.setTimeout(callback, 0)
  })
}

const getSelectionRect = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  const clientRects = Array.from(range.getClientRects())
  const targetRect = clientRects[clientRects.length - 1] ?? range.getBoundingClientRect()

  if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
    return null
  }

  return targetRect
}

const ensureToolbar = (onCreateAnnotation: ObserveSelectionOptions['onCreateAnnotation']) => {
  const existingToolbar = document.getElementById(TOOLBAR_ID)
  if (existingToolbar) {
    return existingToolbar as HTMLDivElement
  }

  const toolbar = document.createElement('div')
  toolbar.id = TOOLBAR_ID
  toolbar.style.position = 'fixed'
  toolbar.style.zIndex = '2147483647'
  toolbar.style.display = 'none'
  toolbar.style.alignItems = 'center'
  toolbar.style.gap = '8px'
  toolbar.style.padding = '10px 12px'
  toolbar.style.borderRadius = '999px'
  toolbar.style.background = 'rgba(43, 33, 24, 0.94)'
  toolbar.style.boxShadow = '0 18px 36px rgba(43, 33, 24, 0.24)'
  toolbar.style.backdropFilter = 'blur(8px)'
  toolbar.style.color = '#fff8e8'
  toolbar.style.fontFamily = '"Segoe UI", "PingFang SC", sans-serif'

  toolbar.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })

  const noteButton = document.createElement('button')
  noteButton.type = 'button'
  noteButton.textContent = '笔记'
  noteButton.setAttribute('data-role', 'note')
  noteButton.setAttribute('aria-label', '为当前选中文本添加笔记')
  noteButton.style.padding = '6px 10px'
  noteButton.style.border = '0'
  noteButton.style.borderRadius = '999px'
  noteButton.style.background = '#f7efe1'
  noteButton.style.color = '#4c351d'
  noteButton.style.cursor = 'pointer'
  noteButton.style.fontSize = '12px'
  noteButton.style.fontWeight = '700'

  noteButton.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })

  toolbar.append(noteButton)

  for (const colorOption of ANNOTATION_COLORS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.title = colorOption.label
    button.setAttribute('aria-label', `使用${colorOption.label}高亮`)
    button.style.width = '22px'
    button.style.height = '22px'
    button.style.border = '2px solid rgba(255, 255, 255, 0.7)'
    button.style.borderRadius = '999px'
    button.style.background = colorOption.swatch
    button.style.cursor = 'pointer'
    button.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.18)'

    button.addEventListener('mousedown', (event) => {
      event.preventDefault()
    })

    button.addEventListener('click', async () => {
      await onCreateAnnotation(colorOption.value)
      toolbar.style.display = 'none'
    })

    toolbar.append(button)
  }

  document.body.append(toolbar)
  return toolbar
}

const ensurePanel = (): PanelElements => {
  const existingPanel = document.getElementById(PANEL_ID)
  if (existingPanel) {
    return {
      panel: existingPanel as HTMLDivElement,
      status: existingPanel.querySelector('[data-role="status"]') as HTMLParagraphElement,
      body: existingPanel.querySelector('[data-role="body"]') as HTMLParagraphElement,
      meta: existingPanel.querySelector('[data-role="meta"]') as HTMLParagraphElement,
      copyButton: existingPanel.querySelector('[data-role="copy"]') as HTMLButtonElement
    }
  }

  const panel = document.createElement('div')
  panel.id = PANEL_ID
  panel.style.position = 'fixed'
  panel.style.zIndex = '2147483647'
  panel.style.display = 'none'
  panel.style.maxWidth = '320px'
  panel.style.padding = '14px'
  panel.style.borderRadius = '16px'
  panel.style.background = 'rgba(255, 250, 241, 0.98)'
  panel.style.boxShadow = '0 18px 36px rgba(43, 33, 24, 0.18)'
  panel.style.border = '1px solid rgba(197, 161, 111, 0.34)'
  panel.style.color = '#35281d'
  panel.style.fontFamily = '"Segoe UI", "PingFang SC", sans-serif'

  const status = document.createElement('p')
  status.setAttribute('data-role', 'status')
  status.style.margin = '0 0 8px'
  status.style.fontSize = '12px'
  status.style.fontWeight = '700'
  status.style.color = '#9c6b2f'

  const body = document.createElement('p')
  body.setAttribute('data-role', 'body')
  body.style.margin = '0'
  body.style.fontSize = '14px'
  body.style.lineHeight = '1.6'
  body.style.whiteSpace = 'pre-wrap'
  body.style.wordBreak = 'break-word'

  const meta = document.createElement('p')
  meta.setAttribute('data-role', 'meta')
  meta.style.margin = '10px 0 0'
  meta.style.fontSize = '12px'
  meta.style.color = '#7d6a58'

  const actionRow = document.createElement('div')
  actionRow.style.display = 'flex'
  actionRow.style.justifyContent = 'flex-end'
  actionRow.style.marginTop = '12px'

  const copyButton = document.createElement('button')
  copyButton.type = 'button'
  copyButton.setAttribute('data-role', 'copy')
  copyButton.textContent = '复制译文'
  copyButton.style.border = '0'
  copyButton.style.borderRadius = '999px'
  copyButton.style.padding = '6px 10px'
  copyButton.style.background = '#f2d79a'
  copyButton.style.color = '#4c351d'
  copyButton.style.cursor = 'pointer'
  copyButton.style.fontSize = '12px'
  copyButton.style.fontWeight = '700'
  copyButton.style.display = 'none'

  copyButton.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })

  actionRow.append(copyButton)

  panel.append(status, body, meta, actionRow)
  document.body.append(panel)

  return { panel, status, body, meta, copyButton }
}

const ensureNotePanel = (): NotePanelElements => {
  const existingPanel = document.getElementById(NOTE_PANEL_ID)
  if (existingPanel) {
    return {
      panel: existingPanel as HTMLDivElement,
      textarea: existingPanel.querySelector('[data-role="note-input"]') as HTMLTextAreaElement,
      saveButton: existingPanel.querySelector('[data-role="note-save"]') as HTMLButtonElement,
      cancelButton: existingPanel.querySelector('[data-role="note-cancel"]') as HTMLButtonElement,
      status: existingPanel.querySelector('[data-role="note-status"]') as HTMLParagraphElement
    }
  }

  const panel = document.createElement('div')
  panel.id = NOTE_PANEL_ID
  panel.style.position = 'fixed'
  panel.style.zIndex = '2147483647'
  panel.style.display = 'none'
  panel.style.width = '320px'
  panel.style.padding = '14px'
  panel.style.borderRadius = '16px'
  panel.style.background = 'rgba(255, 250, 241, 0.98)'
  panel.style.boxShadow = '0 18px 36px rgba(43, 33, 24, 0.18)'
  panel.style.border = '1px solid rgba(197, 161, 111, 0.34)'
  panel.style.color = '#35281d'
  panel.style.fontFamily = '"Segoe UI", "PingFang SC", sans-serif'

  const status = document.createElement('p')
  status.setAttribute('data-role', 'note-status')
  status.textContent = '为当前划词添加笔记'
  status.style.margin = '0 0 8px'
  status.style.fontSize = '12px'
  status.style.fontWeight = '700'
  status.style.color = '#9c6b2f'

  const textarea = document.createElement('textarea')
  textarea.setAttribute('data-role', 'note-input')
  textarea.placeholder = '输入你想记录的笔记...'
  textarea.style.width = '100%'
  textarea.style.minHeight = '92px'
  textarea.style.boxSizing = 'border-box'
  textarea.style.padding = '10px 12px'
  textarea.style.border = '1px solid #e4d5b3'
  textarea.style.borderRadius = '12px'
  textarea.style.background = '#fffdf8'
  textarea.style.color = '#2b2118'
  textarea.style.font = 'inherit'
  textarea.style.resize = 'vertical'

  const actionRow = document.createElement('div')
  actionRow.style.display = 'grid'
  actionRow.style.gridTemplateColumns = '1fr 1fr'
  actionRow.style.gap = '10px'
  actionRow.style.marginTop = '12px'

  const cancelButton = document.createElement('button')
  cancelButton.type = 'button'
  cancelButton.setAttribute('data-role', 'note-cancel')
  cancelButton.textContent = '取消'
  cancelButton.style.border = '0'
  cancelButton.style.borderRadius = '12px'
  cancelButton.style.padding = '10px 12px'
  cancelButton.style.background = '#f5ecd8'
  cancelButton.style.color = '#574537'
  cancelButton.style.cursor = 'pointer'
  cancelButton.style.font = 'inherit'

  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.setAttribute('data-role', 'note-save')
  saveButton.textContent = '保存笔记'
  saveButton.style.border = '0'
  saveButton.style.borderRadius = '12px'
  saveButton.style.padding = '10px 12px'
  saveButton.style.background = 'linear-gradient(135deg, #d7b466 0%, #bb8d32 100%)'
  saveButton.style.color = '#3b2a16'
  saveButton.style.cursor = 'pointer'
  saveButton.style.font = 'inherit'
  saveButton.style.fontWeight = '700'

  actionRow.append(cancelButton, saveButton)
  panel.append(status, textarea, actionRow)
  document.body.append(panel)

  return { panel, textarea, saveButton, cancelButton, status }
}

const ensureSavedNotePanel = (): SavedNotePanelElements => {
  const existingPanel = document.getElementById(SAVED_NOTE_PANEL_ID)
  if (existingPanel) {
    return {
      panel: existingPanel as HTMLDivElement,
      title: existingPanel.querySelector('[data-role="saved-note-title"]') as HTMLParagraphElement,
      body: existingPanel.querySelector('[data-role="saved-note-body"]') as HTMLParagraphElement,
      closeButton: existingPanel.querySelector('[data-role="saved-note-close"]') as HTMLButtonElement
    }
  }

  const panel = document.createElement('div')
  panel.id = SAVED_NOTE_PANEL_ID
  panel.style.position = 'fixed'
  panel.style.zIndex = '2147483647'
  panel.style.display = 'none'
  panel.style.maxWidth = '320px'
  panel.style.padding = '14px'
  panel.style.borderRadius = '16px'
  panel.style.background = 'rgba(255, 250, 241, 0.98)'
  panel.style.boxShadow = '0 18px 36px rgba(43, 33, 24, 0.18)'
  panel.style.border = '1px solid rgba(197, 161, 111, 0.34)'
  panel.style.color = '#35281d'
  panel.style.fontFamily = '"Segoe UI", "PingFang SC", sans-serif'

  const title = document.createElement('p')
  title.setAttribute('data-role', 'saved-note-title')
  title.textContent = '划词笔记'
  title.style.margin = '0 0 8px'
  title.style.fontSize = '12px'
  title.style.fontWeight = '700'
  title.style.color = '#9c6b2f'

  const body = document.createElement('p')
  body.setAttribute('data-role', 'saved-note-body')
  body.style.margin = '0'
  body.style.fontSize = '14px'
  body.style.lineHeight = '1.6'
  body.style.whiteSpace = 'pre-wrap'
  body.style.wordBreak = 'break-word'

  const actionRow = document.createElement('div')
  actionRow.style.display = 'flex'
  actionRow.style.justifyContent = 'flex-end'
  actionRow.style.marginTop = '12px'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.setAttribute('data-role', 'saved-note-close')
  closeButton.textContent = '关闭'
  closeButton.style.border = '0'
  closeButton.style.borderRadius = '999px'
  closeButton.style.padding = '6px 10px'
  closeButton.style.background = '#f5ecd8'
  closeButton.style.color = '#574537'
  closeButton.style.cursor = 'pointer'
  closeButton.style.font = 'inherit'

  actionRow.append(closeButton)
  panel.append(title, body, actionRow)
  document.body.append(panel)

  return { panel, title, body, closeButton }
}

const hasMeaningfulSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false
  }

  return selection.toString().trim().length > 0
}

const positionToolbar = (toolbar: HTMLDivElement) => {
  const rect = getSelectionRect()
  if (!rect) {
    toolbar.style.display = 'none'
    return
  }

  toolbar.style.display = 'flex'

  const top = Math.max(12, rect.top - TOOLBAR_OFFSET_Y - 38)
  const left = Math.min(
    window.innerWidth - toolbar.offsetWidth - 12,
    Math.max(12, rect.left + rect.width / 2 - toolbar.offsetWidth / 2)
  )

  toolbar.style.top = `${top}px`
  toolbar.style.left = `${left}px`
}

const positionPanel = (panel: HTMLDivElement) => {
  const rect = getSelectionRect()
  if (!rect) {
    panel.style.display = 'none'
    return
  }

  const top = Math.min(window.innerHeight - panel.offsetHeight - 12, Math.max(12, rect.bottom + PANEL_OFFSET_Y))
  const left = Math.min(
    window.innerWidth - panel.offsetWidth - 12,
    Math.max(12, rect.left + rect.width / 2 - panel.offsetWidth / 2)
  )

  panel.style.top = `${top}px`
  panel.style.left = `${left}px`
}

export const observeSelection = ({ onCreateAnnotation, onCreateNote, onTranslateSelection }: ObserveSelectionOptions) => {
  const toolbar = ensureToolbar(onCreateAnnotation)
  const panelElements = ensurePanel()
  const notePanelElements = ensureNotePanel()
  const savedNotePanelElements = ensureSavedNotePanel()
  // 
  let pendingNoteRange: Range | null = null
  let isComposingNote = false

  let noteButton = toolbar.querySelector('[data-role="note"]') as HTMLButtonElement | null
  let translateButton = toolbar.querySelector('[data-role="translate"]') as HTMLButtonElement | null

  if (!noteButton) {
    noteButton = document.createElement('button')
    noteButton.type = 'button'
    noteButton.textContent = '笔记'
    noteButton.setAttribute('data-role', 'note')
    noteButton.setAttribute('aria-label', '为当前选中文本添加笔记')
    noteButton.style.padding = '6px 10px'
    noteButton.style.border = '0'
    noteButton.style.borderRadius = '999px'
    noteButton.style.background = '#f7efe1'
    noteButton.style.color = '#4c351d'
    noteButton.style.cursor = 'pointer'
    noteButton.style.fontSize = '12px'
    noteButton.style.fontWeight = '700'

    noteButton.addEventListener('mousedown', (event) => {
      event.preventDefault()
    })

    toolbar.prepend(noteButton)
  }

  if (!translateButton) {
    translateButton = document.createElement('button')
    translateButton.type = 'button'
    translateButton.textContent = '翻译'
    translateButton.setAttribute('data-role', 'translate')
    translateButton.setAttribute('aria-label', '翻译当前选中文本')
    translateButton.style.marginLeft = '4px'
    translateButton.style.padding = '6px 10px'
    translateButton.style.border = '0'
    translateButton.style.borderRadius = '999px'
    translateButton.style.background = '#f2d79a'
    translateButton.style.color = '#4c351d'
    translateButton.style.cursor = 'pointer'
    translateButton.style.fontSize = '12px'
    translateButton.style.fontWeight = '700'

    translateButton.addEventListener('mousedown', (event) => {
      event.preventDefault()
    })

    toolbar.append(translateButton)
  }

  const hideToolbar = () => {
    toolbar.style.display = 'none'
  }

  const hidePanel = () => {
    panelElements.panel.style.display = 'none'
    panelElements.copyButton.style.display = 'none'
    panelElements.copyButton.disabled = false
    panelElements.copyButton.textContent = '复制译文'
  }

  // const hideNotePanel = () => {
  //   notePanelElements.panel.style.display = 'none'
  //   notePanelElements.textarea.value = ''
  //   notePanelElements.status.textContent = '为当前划词添加笔记'
  //   notePanelElements.status.style.color = '#9c6b2f'
  //   notePanelElements.saveButton.disabled = false
  //   notePanelElements.saveButton.textContent = '保存笔记'
  // }
  const hideNotePanel = () => {
  notePanelElements.panel.style.display = 'none'
  notePanelElements.textarea.value = ''
  notePanelElements.status.textContent = '为当前划词添加笔记'
  notePanelElements.status.style.color = '#9c6b2f'
  notePanelElements.saveButton.disabled = false
  notePanelElements.saveButton.textContent = '保存笔记'
  pendingNoteRange = null
  isComposingNote = false
}

  const hideSavedNotePanel = () => {
    savedNotePanelElements.panel.style.display = 'none'
  }

  const showPanelMessage = (statusText: string, bodyText: string, metaText = '', isError = false, showCopyButton = false) => {
    panelElements.panel.style.display = 'block'
    panelElements.status.textContent = statusText
    panelElements.body.textContent = bodyText
    panelElements.meta.textContent = metaText
    panelElements.status.style.color = isError ? '#a12d22' : '#9c6b2f'
    panelElements.copyButton.style.display = showCopyButton ? 'inline-flex' : 'none'
    panelElements.copyButton.textContent = '复制译文'
    panelElements.copyButton.disabled = false
    positionPanel(panelElements.panel)
  }

  const showSavedNotePanel = (anchorElement: HTMLElement, note: string) => {
    savedNotePanelElements.panel.style.display = 'block'
    savedNotePanelElements.title.textContent = '划词笔记'
    savedNotePanelElements.body.textContent = note

    const rect = anchorElement.getBoundingClientRect()
    const top = Math.min(
      window.innerHeight - savedNotePanelElements.panel.offsetHeight - 12,
      Math.max(12, rect.bottom + PANEL_OFFSET_Y)
    )
    const left = Math.min(
      window.innerWidth - savedNotePanelElements.panel.offsetWidth - 12,
      Math.max(12, rect.left + rect.width / 2 - savedNotePanelElements.panel.offsetWidth / 2)
    )

    savedNotePanelElements.panel.style.top = `${top}px`
    savedNotePanelElements.panel.style.left = `${left}px`
  }

  // const syncToolbar = () => {
  //   if (!hasMeaningfulSelection()) {
  //     hideToolbar()
  //     hidePanel()
  //     hideNotePanel()
  //     return
  //   }

  //   positionToolbar(toolbar)
  // }
//   const syncToolbar = () => {
//   const isNotePanelOpen = notePanelElements.panel.style.display === 'block'

//   if (!hasMeaningfulSelection()) {
//     hideToolbar()
//     hidePanel()

//     if (!isNotePanelOpen) {
//       hideNotePanel()
//     }

//     return
//   }

//   positionToolbar(toolbar)
// }
const syncToolbar = () => {
  if (isComposingNote) {
    return
  }

  if (!hasMeaningfulSelection()) {
    hideToolbar()
    hidePanel()
    hideNotePanel()
    return
  }

  positionToolbar(toolbar)
}

  // noteButton.addEventListener('click', () => {
  //   hidePanel()
  //   hideSavedNotePanel()
  //   notePanelElements.panel.style.display = 'block'
  //   notePanelElements.status.textContent = '为当前划词添加笔记'
  //   notePanelElements.status.style.color = '#9c6b2f'
  //   positionPanel(notePanelElements.panel)
  //   window.setTimeout(() => notePanelElements.textarea.focus(), 0)
  // })

  // 改为点击“笔记”按钮后先检查是否有有效选区，如果没有则提示用户先选中文本；如果有，则将选区保存到 pendingNoteRange 中，并打开笔记输入面板
  noteButton.addEventListener('click', () => {
  const selection = window.getSelection()
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  if (!range || range.collapsed || !range.toString().trim()) {
    notePanelElements.panel.style.display = 'block'
    notePanelElements.status.textContent = '请先选中一段文本再添加笔记'
    notePanelElements.status.style.color = '#a12d22'
    positionPanel(notePanelElements.panel)
    return
  }

  pendingNoteRange = range.cloneRange()
  isComposingNote = true

  hidePanel()
  notePanelElements.panel.style.display = 'block'
  notePanelElements.status.textContent = '为当前划词添加笔记'
  notePanelElements.status.style.color = '#9c6b2f'
  positionPanel(notePanelElements.panel)

  window.setTimeout(() => notePanelElements.textarea.focus(), 0)
})
// 监听输入法状态，避免在输入过程中同步选区导致的面板闪烁和光标丢失
  translateButton.addEventListener('click', async () => {
    const selectionText = window.getSelection()?.toString().trim() ?? ''

    if (!selectionText) {
      showPanelMessage('无法翻译', '请先选中一段文本再试一次。', '', true)
      return
    }

    translateButton.disabled = true
    translateButton.textContent = '翻译中...'
    showPanelMessage('有道翻译', '正在请求翻译结果...')

    try {
      const result = await onTranslateSelection(selectionText)
      showPanelMessage('有道翻译', result.translation, `${result.detectedSourceLanguage} -> ${result.targetLanguage}`, false, true)
    } catch (error) {
      showPanelMessage('翻译失败', error instanceof Error ? error.message : '翻译请求失败', '', true)
    } finally {
      translateButton.disabled = false
      translateButton.textContent = '翻译'
    }
  })

  panelElements.copyButton.addEventListener('click', async () => {
    const translationText = panelElements.body.textContent?.trim() ?? ''

    if (!translationText) {
      return
    }

    panelElements.copyButton.disabled = true
    panelElements.copyButton.textContent = '复制中...'

    try {
      await copyText(translationText)
      panelElements.copyButton.textContent = '已复制'
      panelElements.meta.textContent = panelElements.meta.textContent
        ? `${panelElements.meta.textContent} · 已复制到剪贴板`
        : '已复制到剪贴板'
    } catch (error) {
      panelElements.copyButton.textContent = '复制失败'
      panelElements.status.textContent = '复制失败'
      panelElements.status.style.color = '#a12d22'
      panelElements.meta.textContent = error instanceof Error ? error.message : '复制到剪贴板失败'
    } finally {
      window.setTimeout(() => {
        panelElements.copyButton.disabled = false
        if (panelElements.copyButton.textContent === '已复制') {
          panelElements.copyButton.textContent = '复制译文'
        }
      }, 1200)
    }
  })

  notePanelElements.cancelButton.addEventListener('click', () => {
    hideNotePanel()
  })

  savedNotePanelElements.closeButton.addEventListener('click', () => {
    hideSavedNotePanel()
  })

notePanelElements.saveButton.addEventListener('click', async () => {
  const note = notePanelElements.textarea.value.trim()

  if (!note) {
    notePanelElements.status.textContent = '请输入笔记内容'
    notePanelElements.status.style.color = '#a12d22'
    notePanelElements.textarea.focus()
    return
  }

  notePanelElements.saveButton.disabled = true
  notePanelElements.saveButton.textContent = '保存中...'
  notePanelElements.status.textContent = '正在保存笔记...'
  notePanelElements.status.style.color = '#9c6b2f'

  try {
    if (!pendingNoteRange) {
      throw new Error('原始划词已丢失，请重新划词后再添加笔记')
    }

    await onCreateNote(pendingNoteRange.cloneRange(), note)
    hideNotePanel()
    hideToolbar()
  } catch (error) {
    notePanelElements.status.textContent = error instanceof Error ? error.message : '保存笔记失败'
    notePanelElements.status.style.color = '#a12d22'
    notePanelElements.saveButton.disabled = false
    notePanelElements.saveButton.textContent = '保存笔记'
  }
})

  document.addEventListener('selectionchange', () => {
    scheduleFrame(syncToolbar)
  })

  document.addEventListener('mouseup', () => {
    scheduleFrame(syncToolbar)
  })

  document.addEventListener('keyup', () => {
    scheduleFrame(syncToolbar)
  })

  document.addEventListener(
    'scroll',
    () => {
      hideToolbar()
      hidePanel()
      hideNotePanel()
      hideSavedNotePanel()
    },
    true
  )
  window.addEventListener('resize', () => {
    hideToolbar()
    hidePanel()
    hideNotePanel()
    hideSavedNotePanel()
  })
  document.addEventListener('mousedown', (event) => {
    const noteMarker = (event.target as HTMLElement | null)?.closest('[data-mingcai-note-marker="true"]') as HTMLElement | null

    if (noteMarker) {
      event.preventDefault()
      event.stopPropagation()
      hidePanel()
      hideNotePanel()

      const noteHost = noteMarker.closest('mark[data-mingcai-has-note="true"]') as HTMLElement | null
      const note = noteHost?.dataset.mingcaiNote?.trim() ?? ''

      if (note) {
        showSavedNotePanel(noteMarker, note)
      }

      return
    }

    if (
      !toolbar.contains(event.target as Node) &&
      !panelElements.panel.contains(event.target as Node) &&
      !notePanelElements.panel.contains(event.target as Node) &&
      !savedNotePanelElements.panel.contains(event.target as Node)
    ) {
      hidePanel()
      hideNotePanel()
      hideSavedNotePanel()
      scheduleFrame(syncToolbar)
    }
  })
}