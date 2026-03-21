import { getPageBucket } from '../../modules/annotations/repository/annotationRepository'
import { restoreAnnotation } from '../../modules/annotations/domain/restoreAnnotation'
import { clearAllRenderedAnnotations } from '../../modules/annotations/rendering/highlightRenderer'
import { getPageKey } from '../../shared/utils/pageKey'

const RESTORE_RETRY_DELAYS = [250, 800, 1500, 3000, 5000]
const MUTATION_DEBOUNCE_MS = 250

let activePageKey = ''
let retryCount = 0
let retryTimer: number | null = null
let mutationTimer: number | null = null
let domObserver: MutationObserver | null = null
let lifecycleStarted = false

const clearRetryTimer = () => {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer)
    retryTimer = null
  }
}

const resetRestoreState = (pageKey: string, shouldClearRendered = false) => {
  activePageKey = pageKey
  retryCount = 0
  clearRetryTimer()

  if (shouldClearRendered) {
    clearAllRenderedAnnotations()
  }
}

const restoreCurrentPageAnnotations = async () => {
  const currentPageKey = getPageKey(window.location.href)

  if (currentPageKey !== activePageKey) {
    resetRestoreState(currentPageKey, true)
  }

  const bucket = await getPageBucket(currentPageKey)
  const annotations = bucket?.annotations ?? []

  if (annotations.length === 0) {
    clearRetryTimer()
    return
  }

  let pendingRestoreCount = 0

  for (const annotation of annotations) {
    const restored = restoreAnnotation(annotation)
    if (!restored) {
      pendingRestoreCount += 1
    }
  }

  if (pendingRestoreCount === 0) {
    clearRetryTimer()
    return
  }

  if (retryCount >= RESTORE_RETRY_DELAYS.length) {
    return
  }

  const delay = RESTORE_RETRY_DELAYS[retryCount]
  retryCount += 1
  clearRetryTimer()
  retryTimer = window.setTimeout(() => {
    void restoreCurrentPageAnnotations()
  }, delay)
}

const handleRouteChange = () => {
  const nextPageKey = getPageKey(window.location.href)
  if (nextPageKey === activePageKey) {
    return
  }

  resetRestoreState(nextPageKey, true)
  void restoreCurrentPageAnnotations()
}

const setupRouteListeners = () => {
  const historyApi = window.history as History & {
    __mingcaiPatched?: boolean
  }

  if (!historyApi.__mingcaiPatched) {
    const originalPushState = historyApi.pushState.bind(historyApi)
    const originalReplaceState = historyApi.replaceState.bind(historyApi)

    historyApi.pushState = ((...args: Parameters<History['pushState']>) => {
      originalPushState(...args)
      window.dispatchEvent(new Event('mingcai:navigation'))
    }) as History['pushState']

    historyApi.replaceState = ((...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args)
      window.dispatchEvent(new Event('mingcai:navigation'))
    }) as History['replaceState']

    historyApi.__mingcaiPatched = true
  }

  window.addEventListener('popstate', handleRouteChange)
  window.addEventListener('hashchange', handleRouteChange)
  window.addEventListener('mingcai:navigation', handleRouteChange)
}

const setupDomObserver = () => {
  if (domObserver || !document.body) {
    return
  }

  domObserver = new MutationObserver(() => {
    if (mutationTimer !== null) {
      window.clearTimeout(mutationTimer)
    }

    mutationTimer = window.setTimeout(() => {
      void restoreCurrentPageAnnotations()
    }, MUTATION_DEBOUNCE_MS)
  })

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  })
}

export const bootstrapHighlights = async () => {
  const currentPageKey = getPageKey(window.location.href)

  if (!lifecycleStarted) {
    lifecycleStarted = true
    setupRouteListeners()
    setupDomObserver()
  }

  resetRestoreState(currentPageKey)
  await restoreCurrentPageAnnotations()
}