// 页面内高亮样式注入器。
// 之所以在运行时注入样式，而不是依赖宿主页面样式，是为了让 content script 的高亮表现稳定、可控。
const STYLE_ID = 'mingcai-highlight-style'

export const ensureHighlightStyle = () => {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  // 只注入一次，避免重复插入 style 节点。
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    mark[data-mingcai-annotation="true"] {
      color: inherit;
      border-radius: 0.2em;
      padding: 0.05em 0.02em;
      box-decoration-break: clone;
    }

    mark[data-mingcai-color="yellow"] {
      background: #ffe37a;
    }

    mark[data-mingcai-color="green"] {
      background: #c9ef8b;
    }

    mark[data-mingcai-color="blue"] {
      background: #9fd3ff;
    }

    mark[data-mingcai-color="pink"] {
      background: #ffbfd3;
    }
  `

  document.head.append(style)
}