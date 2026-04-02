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
    @keyframes mingcai-jump-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.38);
      }

      70% {
        box-shadow: 0 0 0 10px rgba(26, 115, 232, 0);
      }

      100% {
        box-shadow: 0 0 0 0 rgba(26, 115, 232, 0);
      }
    }

    mark[data-mingcai-annotation="true"] {
      color: inherit;
      border-radius: 0.2em;
      padding: 0.05em 0.02em;
      box-decoration-break: clone;
    }

    mark[data-mingcai-has-note="true"] {
      text-decoration-line: underline;
      text-decoration-style: wavy;
      text-decoration-color: #d8ab19;
      text-decoration-thickness: 1.5px;
      text-underline-offset: 0.18em;
    }

    mark[data-mingcai-has-note="true"] [data-mingcai-note-marker="true"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.35em;
      height: 1.35em;
      margin-right: 0.18em;
      border: 0;
      border-radius: 999px;
      background: #f2d35d;
      color: #5b4300;
      font: inherit;
      font-size: 0.78em;
      font-weight: 700;
      line-height: 1;
      vertical-align: baseline;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(91, 67, 0, 0.18);
    }

    mark[data-mingcai-has-note="true"] [data-mingcai-note-marker="true"]:hover {
      transform: translateY(-1px);
    }

    mark[data-mingcai-has-note="true"] [data-mingcai-note-marker="true"]:focus,
    mark[data-mingcai-has-note="true"] [data-mingcai-note-marker="true"]:focus-visible {
      outline: 2px solid #1a73e8;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.35), 0 2px 6px rgba(91, 67, 0, 0.18);
    }

    mark[data-mingcai-jump-target="true"] {
      animation: mingcai-jump-pulse 0.9s ease-out 2;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.35);
      scroll-margin-block: 96px;
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