# 明彩源码阅读指南

这份文档不是功能说明书，而是“如何读当前这版项目”的路径图。

如果你直接从某个细节文件开始看，很容易陷进 DOM、消息通信或存储细节里，导致只看见局部，不知道它在整条链路中的位置。

更高效的读法是：

1. 先看入口
2. 再看消息路由
3. 再看 annotation 的创建、保存、恢复
4. 再看 Popup 如何驱动当前页能力
5. 最后看历史总览页如何组织全局能力

## 1. 先建立整体心智模型

这个项目本质上是一条很明确的浏览器扩展链路：

1. 用户在网页里选中文本
2. 通过划词浮层或右键菜单触发创建高亮
3. Background 把消息发给当前页面的 Content Script
4. Content Script 在页面里读取当前 Selection，生成 annotation
5. annotation 一边被渲染成黄色高亮，一边被存进 browser.storage.local
6. 页面再次打开或刷新时，Content Script 从存储读出 annotation 并恢复高亮
7. Popup 读取当前页数据，执行导出、导入、删除、清空、打开历史总览等操作
8. 历史总览页直接读取全局分桶数据，执行跨页面浏览和删除同步

如果你先记住这 7 步，后面的文件基本都能对上位置。

## 2. 推荐阅读顺序

### 第一轮：看入口文件

先读这几个文件：

- [entrypoints/background.ts](entrypoints/background.ts)
- [entrypoints/content.ts](entrypoints/content.ts)
- [entrypoints/popup/App.vue](entrypoints/popup/App.vue)
- [entrypoints/history/App.vue](entrypoints/history/App.vue)

你要重点看清两个问题：

1. Background 做什么
2. Content Script 做什么

Background 负责：

- 扩展安装或启动时注册右键菜单
- 用户点击右键菜单后，把“创建高亮”或“取消选区高亮”消息发给当前 tab
- 接收 Popup 或其他入口发来的运行时消息，并交给统一路由处理

Content Script 负责：

- 页面加载后自动恢复高亮
- 监听划词并显示颜色浮层
- 监听页面消息
- 在页面上下文里真正读取选区、创建 annotation、渲染高亮

Popup 负责：

- 展示当前页摘要和摘录
- 发起导出、导入、单条删除、清空、打开历史总览

History 页负责：

- 展示全局分桶数据
- 打开原网页
- 删除单条历史标记

这里的一个关键设计是：

- Background 不直接操作页面 DOM
- Popup 不直接操作页面 DOM
- 只有 Content Script 可以碰页面选区和高亮渲染

这是这个项目里最重要的职责边界之一。

### 第二轮：看统一消息路由

接着读：

- [src/modules/messaging/messageRouter.ts](src/modules/messaging/messageRouter.ts)

这是当前项目最接近“业务总入口”的文件。

你可以把它理解为：

- 所有入口把需求翻译成 message
- messageRouter 再把这些需求分发到对应模块去执行

建议你重点看这几个分支：

1. `CREATE_ANNOTATION_FROM_SELECTION`
2. `REMOVE_ANNOTATION_BY_ID`
3. `REMOVE_ANNOTATIONS_FROM_SELECTION`
4. `GET_CURRENT_PAGE_ANNOTATIONS`
5. `CLEAR_CURRENT_PAGE_ANNOTATIONS`
6. `EXPORT_ANNOTATIONS`
7. `IMPORT_ANNOTATIONS`

其中最重要的是 `handleCreateAnnotationFromSelection`，因为它串起了：

- 读取当前选区
- 规范化 Range
- 创建 AnnotationRecord
- 渲染到页面
- 保存到存储

这基本就是项目的主链路核心。

### 第三轮：看 annotation 是什么

然后读：

- [src/shared/types/annotation.ts](src/shared/types/annotation.ts)

重点看三个类型：

1. `AnnotationRecord`
2. `PageAnnotationBucket`
3. `ExportBundle`

你可以这样理解：

- `AnnotationRecord`：一条高亮记录
- `PageAnnotationBucket`：某个页面下的所有高亮
- `ExportBundle`：整个扩展导出的完整数据包

当前项目不是“按单条记录散存”，而是“按页面 key 分桶存”。

好处是：

- 当前页读取很快
- Popup 展示当前页很直接
- 导出时结构也清晰

### 第四轮：看 annotation 怎么创建

读这几个文件：

- [src/modules/annotations/domain/createAnnotation.ts](src/modules/annotations/domain/createAnnotation.ts)
- [src/modules/annotations/anchoring/serializeSelection.ts](src/modules/annotations/anchoring/textQuote.ts)
- [src/modules/annotations/anchoring/serializeSelection.ts](src/modules/annotations/anchoring/serializeSelection.ts)
- [src/modules/annotations/anchoring/domPath.ts](src/modules/annotations/anchoring/domPath.ts)

这里你要搞明白一个核心点：

为什么不能只存“用户选中的那段文本”？

因为如果页面里有重复文本，单靠文本本身是没法稳定恢复的。

所以当前项目会同时保存两类信息：

1. DOM 锚点
内容是：
- 起始容器路径
- 结束容器路径
- 起始 offset
- 结束 offset

2. 文本锚点
内容是：
- 主文本 `textQuote`
- 前文 `prefixText`
- 后文 `suffixText`

`domPath.ts` 做的是把一个节点编码成路径字符串。

例如：

- `0.3.2`

表示从 `document.body` 开始，一层层按 childNodes 下标往下走，最终找到目标节点。

这套机制的意义是：

- 页面没怎么变时，路径恢复快而且准
- 页面结构变了时，还能尝试走文本匹配兜底

### 第五轮：看 annotation 怎么恢复

然后读：

- [src/modules/annotations/anchoring/resolveAnchor.ts](src/modules/annotations/anchoring/resolveAnchor.ts)
- [src/modules/annotations/domain/restoreAnnotation.ts](src/modules/annotations/domain/restoreAnnotation.ts)

恢复顺序是：

1. 先尝试通过 DOM 路径恢复 Range
2. 如果失败，再尝试通过 `textQuote` 在文本节点里匹配
3. 恢复出 Range 后，再交给渲染层包一层 `mark`

这里要特别注意：

当前版本的文本恢复还是 MVP 级别。

当前版本已经不只是“简单字符串匹配”，而是做了更完整的恢复兜底：

- 优先使用 DOM 路径恢复
- 失败后拼接整页文本节点做归一化匹配
- 使用 `textQuote + prefix + suffix` 做候选定位
- 尽量重建跨文本节点 Range

但它仍然是这个项目最值得继续优化的区域，因为复杂 SPA 和重复文本仍然会带来边界情况。

### 第六轮：看页面里的高亮如何渲染

然后读：

- [src/modules/annotations/rendering/rangeNormalizer.ts](src/modules/annotations/rendering/rangeNormalizer.ts)
- [src/modules/annotations/rendering/highlightStyle.ts](src/modules/annotations/rendering/highlightStyle.ts)
- [src/modules/annotations/rendering/highlightRenderer.ts](src/modules/annotations/rendering/highlightRenderer.ts)

这里的职责拆得很清楚：

- `rangeNormalizer.ts`：过滤无效 Range
- `highlightStyle.ts`：确保高亮样式只注入一次
- `highlightRenderer.ts`：把 Range 包成 `mark` 元素

渲染层和存储层是分开的。

这意味着你在读代码时要分清两件事：

- 存储层是否已经变更
- 页面里的 DOM 高亮是否已经被同步移除

当前项目已经为两种删除场景补齐了同步移除链路：

- Popup 删除单条高亮
- 历史总览页删除单条高亮

### 第七轮：看数据怎么进存储

再读：

- [src/modules/annotations/repository/annotationRepository.ts](src/modules/annotations/repository/annotationRepository.ts)

这个文件解决的是：

- 数据放哪
- 按什么结构放
- 怎么读回来
- 怎么导出与导入

建议重点看这几个函数：

1. `getPageBucket`
2. `saveAnnotation`
3. `clearPageAnnotations`
4. `removeAnnotationsByIds`
5. `listPageBuckets`
6. `exportAnnotationBundle`
7. `importAnnotationBundle`

心智模型可以简化成：

- `readBucketMap` / `writeBucketMap` 是底层 I/O
- 其他函数是在这个 I/O 基础上做领域操作

你可以把这个文件看成当前项目的“本地数据库仓储层”。

### 第八轮：看 Popup 怎么调度能力

最后分两轮读 UI：

- [entrypoints/popup/App.vue](entrypoints/popup/App.vue)
- [src/features/popup/usePopupState.ts](src/features/popup/usePopupState.ts)
- [src/features/popup/useCurrentPageAnnotations.ts](src/features/popup/useCurrentPageAnnotations.ts)
- [entrypoints/history/App.vue](entrypoints/history/App.vue)
- [src/features/history/useHistoryOverview.ts](src/features/history/useHistoryOverview.ts)

推荐的理解方式是：

- `App.vue` 只负责组装页面
- `usePopupState.ts` 负责状态和动作
- 组件只负责展示和 emit

例如：

- 点击“导出 JSON”
- 实际不是组件自己导出
- 组件只是 emit 一个事件
- `usePopupState.ts` 负责发消息给 background
- background 再走 `messageRouter`
- `messageRouter` 再调用 exporter 和 downloads 适配层

Popup 的关键是“只管理当前页”，History 页的关键是“管理全部页面”。

如果你把这两个入口混在一起看，很容易误以为它们只是不同 UI；实际上它们背后调度的数据范围和同步策略并不相同。

Popup 更依赖当前活动 tab。

History 页更依赖仓储层和 tabs 适配层。

如果你把 UI 层和业务层混在一起看，很容易觉得项目很乱。

但按这个边界去看，其实结构是比较规整的。

## 3. 三条最值得反复读的调用链

### 调用链 A：创建高亮

按这个顺序读：

1. [entrypoints/background.ts](entrypoints/background.ts)
2. [src/modules/messaging/sendToActiveTab.ts](src/modules/messaging/sendToActiveTab.ts)
3. [entrypoints/content.ts](entrypoints/content.ts)
4. [src/modules/messaging/messageRouter.ts](src/modules/messaging/messageRouter.ts)
5. [src/modules/annotations/domain/createAnnotation.ts](src/modules/annotations/domain/createAnnotation.ts)
6. [src/modules/annotations/rendering/highlightRenderer.ts](src/modules/annotations/rendering/highlightRenderer.ts)
7. [src/modules/annotations/repository/annotationRepository.ts](src/modules/annotations/repository/annotationRepository.ts)

这是项目最核心的一条链。

### 调用链 B：刷新页面后恢复高亮

按这个顺序读：

1. [entrypoints/content.ts](entrypoints/content.ts)
2. [src/features/content/bootstrapHighlights.ts](src/features/content/bootstrapHighlights.ts)
3. [src/modules/annotations/repository/annotationRepository.ts](src/modules/annotations/repository/annotationRepository.ts)
4. [src/modules/annotations/domain/restoreAnnotation.ts](src/modules/annotations/domain/restoreAnnotation.ts)
5. [src/modules/annotations/anchoring/resolveAnchor.ts](src/modules/annotations/anchoring/resolveAnchor.ts)
6. [src/modules/annotations/rendering/highlightRenderer.ts](src/modules/annotations/rendering/highlightRenderer.ts)

### 调用链 C：Popup 导出数据

按这个顺序读：

1. [entrypoints/popup/components/ExportActions.vue](entrypoints/popup/components/ExportActions.vue)
2. [entrypoints/popup/App.vue](entrypoints/popup/App.vue)
3. [src/features/popup/usePopupState.ts](src/features/popup/usePopupState.ts)
4. [src/modules/messaging/sendToBackground.ts](src/modules/messaging/sendToBackground.ts)
5. [src/modules/messaging/messageRouter.ts](src/modules/messaging/messageRouter.ts)
6. [src/modules/export/jsonExporter.ts](src/modules/export/jsonExporter.ts)
7. [src/modules/export/markdownExporter.ts](src/modules/export/markdownExporter.ts)
8. [src/modules/browser/downloads.ts](src/modules/browser/downloads.ts)

### 调用链 D：历史总览删除单条标记

按这个顺序读：

1. [entrypoints/history/App.vue](entrypoints/history/App.vue)
2. [src/features/history/useHistoryOverview.ts](src/features/history/useHistoryOverview.ts)
3. [src/modules/annotations/repository/annotationRepository.ts](src/modules/annotations/repository/annotationRepository.ts)
4. [src/modules/browser/tabs.ts](src/modules/browser/tabs.ts)
5. [src/modules/messaging/sendToActiveTab.ts](src/modules/messaging/sendToActiveTab.ts)
6. [src/modules/messaging/messageRouter.ts](src/modules/messaging/messageRouter.ts)

## 4. 读源码时最容易卡住的几个点

### 为什么 Background 也会调用 messageRouter

因为这个项目把“消息接收后的业务处理”集中放到了一个统一入口里。

这样做的好处是：

- Popup 不需要知道具体数据逻辑
- Background 只做接消息和转发
- 业务逻辑不分散在多个入口文件里

### 为什么创建 annotation 时会先 render 再 save

因为当前项目偏重“用户交互的即时反馈”。

用户右键高亮后，应该马上看到页面变化；如果先等存储完成再渲染，交互会显得更慢。

当然，这也意味着如果存储失败，理论上会出现“页面看起来高亮了，但没落盘”的边界情况。

### 为什么清空当前页会刷新页面

因为“清空全部高亮”这条链路当前选择的是更稳的实现：

- 先清空当前页对应 bucket
- 再刷新当前 tab
- 让 content script 按空状态重新进入

这样可以避免在复杂页面里手工拆掉大量 `mark` 节点时留下边界问题。

### 为什么当前恢复算法还不够稳

因为现在的恢复优先级是：

1. DOM 路径
2. 简单文本匹配

而不是更成熟的：

1. DOM 路径
2. 文本主片段 + 前后文联合校验
3. 多候选打分
4. 结构变化后的模糊恢复

也就是说，项目的架构已经为“升级恢复算法”留出了位置，但算法本身还只是第一版。

## 5. 建议你怎么继续读

如果你是第一次系统看这个项目，建议分 3 次：

### 第一次

只看这些文件：

- [entrypoints/background.ts](entrypoints/background.ts)
- [entrypoints/content.ts](entrypoints/content.ts)
- [src/modules/messaging/messageRouter.ts](src/modules/messaging/messageRouter.ts)

目标：看懂主链路怎么流动。

### 第二次

只看 annotation 相关：

- [src/shared/types/annotation.ts](src/shared/types/annotation.ts)
- [src/modules/annotations/domain/createAnnotation.ts](src/modules/annotations/domain/createAnnotation.ts)
- [src/modules/annotations/anchoring/serializeSelection.ts](src/modules/annotations/anchoring/serializeSelection.ts)
- [src/modules/annotations/anchoring/resolveAnchor.ts](src/modules/annotations/anchoring/resolveAnchor.ts)
- [src/modules/annotations/repository/annotationRepository.ts](src/modules/annotations/repository/annotationRepository.ts)

目标：看懂高亮数据是怎么被创建、保存、恢复的。

### 第三次

只看 Popup：

- [entrypoints/popup/App.vue](entrypoints/popup/App.vue)
- [src/features/popup/usePopupState.ts](src/features/popup/usePopupState.ts)
- [entrypoints/popup/components/](entrypoints/popup/components)

目标：看懂 UI 为什么保持比较薄，业务为什么都被推到了 composable 和 modules 里。

### 第四次

只看历史总览：

- [entrypoints/history/App.vue](entrypoints/history/App.vue)
- [src/features/history/useHistoryOverview.ts](src/features/history/useHistoryOverview.ts)
- [src/modules/browser/tabs.ts](src/modules/browser/tabs.ts)

目标：看懂“当前页管理”和“全局管理”在这个项目里是如何拆开的。

## 6. 如果你想继续深挖

接下来最值得深入的两个主题是：

1. 恢复算法为什么仍然值得继续优化
重点读：
- [src/modules/annotations/anchoring/resolveAnchor.ts](src/modules/annotations/anchoring/resolveAnchor.ts)
- [src/modules/annotations/anchoring/textQuote.ts](src/modules/annotations/anchoring/textQuote.ts)

2. 历史总览页为什么不直接操作页面 DOM
重点读：
- [src/features/history/useHistoryOverview.ts](src/features/history/useHistoryOverview.ts)
- [src/modules/browser/tabs.ts](src/modules/browser/tabs.ts)
- [src/modules/messaging/messageRouter.ts](src/modules/messaging/messageRouter.ts)

因为这正好对应这个项目里最关键的一条边界：

- 只让 content script 真正碰页面 DOM
- 其他入口一律通过仓储、tabs 和消息层间接协作

这两个问题正好对应这个项目现在最值得继续打磨的两个方向：恢复稳定性，以及全局管理体验。