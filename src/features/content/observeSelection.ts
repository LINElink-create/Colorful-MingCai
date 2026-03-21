import { ANNOTATION_COLORS } from '../../shared/constants/annotationColors'
import type { AnnotationColor } from '../../shared/types/annotation'

type ObserveSelectionOptions = {
  onCreateAnnotation: (color: AnnotationColor) => Promise<void> | void
}

const TOOLBAR_ID = 'mingcai-selection-toolbar'

const TOOLBAR_OFFSET_Y = 14

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

  const label = document.createElement('span')
  label.textContent = '高亮'
  label.style.fontSize = '12px'
  label.style.letterSpacing = '0.06em'
  label.style.opacity = '0.9'
  toolbar.append(label)

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

export const observeSelection = ({ onCreateAnnotation }: ObserveSelectionOptions) => {
  const toolbar = ensureToolbar(onCreateAnnotation)

  const hideToolbar = () => {
    toolbar.style.display = 'none'
  }

  const syncToolbar = () => {
    if (!hasMeaningfulSelection()) {
      hideToolbar()
      return
    }

    positionToolbar(toolbar)
  }

  document.addEventListener('selectionchange', () => {
    scheduleFrame(syncToolbar)
  })

  document.addEventListener('mouseup', () => {
    scheduleFrame(syncToolbar)
  })

  document.addEventListener('keyup', () => {
    scheduleFrame(syncToolbar)
  })

  document.addEventListener('scroll', hideToolbar, true)
  window.addEventListener('resize', hideToolbar)
  document.addEventListener('mousedown', (event) => {
    if (!toolbar.contains(event.target as Node)) {
      scheduleFrame(syncToolbar)
    }
  })
}