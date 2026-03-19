export const observeSelection = () => {
  // 监听页面选区变化，可用于在用户选中文本后展示悬浮工具条或激活相关操作
  document.addEventListener('selectionchange', () => {
    // MVP 阶段仅保留观察钩子，后续可在此接入悬浮工具条或候选动作
  })
}