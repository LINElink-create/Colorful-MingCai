<!--
说明：本文件为项目的架构与实现蓝图，面向开发者阅读。包含目录结构、模块职责、数据模型与开发顺序。
可作为新成员入职或重构时的参考文档。
-->

# 网页划词高亮 + 导出插件工程蓝图

> 如何阅读：文档自上而下先说明目标与约束，再给出目录与模块拆分。实现时请以 `src/modules` 的领域为主线。

## 1. 目标边界

- 首发浏览器：Chrome、Edge
- 扩展规范：Manifest V3
- 开发框架：WXT + Vue 3 + TypeScript
- MVP 核心：划词高亮、持久化恢复、JSON/Markdown 导出导入
- 数据范围：本地存储，手动导入导出

## 2. 推荐目录结构

```text
明彩/
  package.json
  tsconfig.json
  wxt.config.ts
  .gitignore
  public/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
  docs/
    architecture-plan.md
  entrypoints/
    background.ts
    content.ts
    popup/
      index.html
      main.ts
      App.vue
      components/
        PageSummaryCard.vue
        ExportActions.vue
        ImportActions.vue
        AnnotationList.vue
  src/
    shared/
      constants/
        storageKeys.ts
        messageTypes.ts
        exportFormats.ts
      types/
        annotation.ts
        message.ts
        page.ts
      utils/
        id.ts
        time.ts
        url.ts
        text.ts
    modules/
      annotations/
        domain/
          createAnnotation.ts
          restoreAnnotation.ts
          removeAnnotation.ts
        anchoring/
          serializeSelection.ts
          resolveAnchor.ts
          domPath.ts
          textQuote.ts
        rendering/
          highlightRenderer.ts
          highlightStyle.ts
          rangeNormalizer.ts
        repository/
          annotationRepository.ts
        mappers/
          annotationMapper.ts
      export/
        jsonExporter.ts
        markdownExporter.ts
        importAnnotations.ts
      browser/
        contextMenus.ts
        downloads.ts
        tabs.ts
      messaging/
        sendToActiveTab.ts
        sendToBackground.ts
        messageRouter.ts
    features/
      popup/
        usePopupState.ts
        useCurrentPageAnnotations.ts
      content/
        observeSelection.ts
        bootstrapHighlights.ts
      background/
        registerMenus.ts
        handleDownloads.ts
  tests/
    unit/
      anchoring/
        resolveAnchor.spec.ts
        serializeSelection.spec.ts
      export/
        markdownExporter.spec.ts
        jsonExporter.spec.ts
      annotations/
        annotationRepository.spec.ts
    e2e/
      highlight-persist-export.spec.ts
```

## 3. 分层职责

### entrypoints

只放扩展入口代码，不放复杂业务逻辑。

- `background.ts`：注册右键菜单、接收消息、触发下载
- `content.ts`：页面注入、监听选区、恢复高亮
- `popup/`：弹窗 UI 和用户操作入口

### src/shared

放全局可复用的基础能力。

- `constants/`：常量、事件名、存储 key
- `types/`：通用类型定义
- `utils/`：无副作用工具函数

### src/modules

放稳定的核心业务模块，按领域拆分。

- `annotations/`：标注领域模型、恢复算法、渲染、存储映射
- `export/`：导出与导入能力
- `browser/`：浏览器 API 适配层
- `messaging/`：Popup、Background、Content Script 通信封装

### src/features

放面向具体入口或交互场景的编排逻辑。

- `popup/`：弹窗状态组织
- `content/`：页面行为编排
- `background/`：后台流程编排

### tests

按领域对齐测试，而不是按技术栈堆放。

## 4. 模块命名规范

### 文件命名

- TypeScript 文件统一使用 `camelCase.ts`
- Vue 单文件组件统一使用 `PascalCase.vue`
- 测试文件统一使用 `*.spec.ts`
- 常量文件使用复数名或领域名，例如 `storageKeys.ts`
- 类型文件优先按领域聚合，例如 `annotation.ts`，不要创建大量 `IXXX.ts`

示例：

- 正确：`resolveAnchor.ts`
- 正确：`annotationRepository.ts`
- 正确：`ExportActions.vue`
- 不建议：`annotation_repository.ts`
- 不建议：`doExport.ts`
- 不建议：`utils2.ts`

### 目录命名

- 目录统一使用小写英文
- 使用名词或稳定领域名，不用动词短语
- 优先按业务领域拆目录，不按“helpers/common/misc”这种宽泛名字拆

示例：

- 正确：`annotations/anchoring/`
- 正确：`export/`
- 不建议：`common/`
- 不建议：`misc/`

### 变量与函数命名

- 变量名使用语义明确的英文名
- 函数名必须体现动作和对象
- 布尔值优先用 `is`、`has`、`can` 开头
- 避免 `data`、`item`、`obj` 这类空泛命名

示例：

- `annotationId`
- `pageFingerprint`
- `serializeSelectionRange`
- `restoreAnnotationsForPage`
- `hasValidSelection`

### 类型命名

- 类型、接口、枚举统一用 `PascalCase`
- 不强制使用 `I` 前缀
- 枚举若数量少，优先用字符串字面量联合类型

示例：

- `AnnotationRecord`
- `SerializedAnchor`
- `ExportFormat`
- `RuntimeMessage`

## 5. 核心模块拆分建议

### annotations 模块

这是项目最重要的核心域，建议继续细拆：

#### domain

处理标注的创建、删除、恢复，不直接操作浏览器 API。

- `createAnnotation.ts`
- `restoreAnnotation.ts`
- `removeAnnotation.ts`

#### anchoring

处理“如何把一次选区保存成可恢复的锚点”。

- `serializeSelection.ts`：把当前 Range 转成可存储结构
- `resolveAnchor.ts`：根据页面 DOM 和锚点恢复 Range
- `domPath.ts`：生成和解析 DOM 路径
- `textQuote.ts`：维护文本片段和上下文匹配

#### rendering

只处理页面中的高亮渲染和移除。

- `highlightRenderer.ts`
- `highlightStyle.ts`
- `rangeNormalizer.ts`

#### repository

只处理读写存储，不耦合 UI。

- `annotationRepository.ts`

### export 模块

- `jsonExporter.ts`：输出完整结构化数据
- `markdownExporter.ts`：输出面向阅读和整理的文本
- `importAnnotations.ts`：导入、校验、合并、覆盖策略

### messaging 模块

通信建议统一成一套消息协议，不要在各处写裸字符串。

- `messageTypes.ts` 定义消息类型
- `message.ts` 定义 payload 类型
- `messageRouter.ts` 统一分发

## 6. 推荐数据结构

### AnnotationRecord

```ts
export type AnnotationRecord = {
  id: string
  url: string
  pageTitle: string
  textQuote: string
  prefixText: string
  suffixText: string
  startContainerPath: string
  startOffset: number
  endContainerPath: string
  endOffset: number
  color: string
  note?: string
  createdAt: string
  updatedAt: string
}
```

说明：

- `textQuote` 用于文本匹配恢复
- `prefixText`、`suffixText` 用于上下文校验
- `startContainerPath`、`endContainerPath` 用于 DOM 辅助定位
- `color` 先保留字段，首版即使只有一种颜色也值得预留

### PageAnnotationBucket

```ts
export type PageAnnotationBucket = {
  url: string
  pageTitle: string
  annotations: AnnotationRecord[]
  updatedAt: string
  schemaVersion: number
}
```

说明：

- 按页面 URL 分桶，便于当前页快速查询
- `schemaVersion` 为后续导入迁移做准备

## 7. 消息协议建议

建议统一以下消息：

- `GET_CURRENT_PAGE_ANNOTATIONS`
- `CREATE_ANNOTATION_FROM_SELECTION`
- `REMOVE_ANNOTATION`
- `CLEAR_CURRENT_PAGE_ANNOTATIONS`
- `EXPORT_ANNOTATIONS`
- `IMPORT_ANNOTATIONS`
- `RESTORE_PAGE_ANNOTATIONS`

建议消息结构：

```ts
export type RuntimeMessage<TType extends string, TPayload> = {
  type: TType
  payload: TPayload
}
```

## 8. Popup 组件建议

首版 Popup 不要做重 UI，重点是操作闭环。

建议组件：

- `PageSummaryCard.vue`：显示当前页面标题、高亮数量、最后更新时间
- `ExportActions.vue`：JSON/Markdown 导出按钮
- `ImportActions.vue`：导入文件按钮与导入模式选择
- `AnnotationList.vue`：当前页高亮列表

首版 App 页面结构：

1. 当前页摘要
2. 创建/导出/导入操作区
3. 当前页高亮列表
4. 清空当前页按钮

## 9. 代码约束

### 必须遵守

- 浏览器 API 必须经过适配层或消息层，不要在 UI 组件里直接散落调用
- Content Script 不直接处理下载逻辑
- Popup 不直接操作 DOM 选区
- 领域对象与 UI 展示对象分离
- 导出逻辑必须可单元测试，不依赖浏览器环境

### 明确避免

- 避免把所有逻辑堆进 `content.ts`
- 避免用全局变量保存高亮状态
- 避免在多个入口重复声明消息名和存储 key
- 避免以 URL 纯字符串作为唯一恢复依据

## 10. 开发顺序

### Sprint 1：骨架与类型

- 初始化 WXT + Vue 3 + TypeScript
- 建立目录结构
- 定义 shared types、message types、storage keys
- 建立 annotationRepository 和 exporter 空实现

### Sprint 2：高亮主链路

- 监听选区
- 生成 annotation
- 页面内渲染高亮
- 保存到本地存储
- 刷新后恢复

### Sprint 3：Popup 与导出

- 当前页高亮列表
- JSON 导出
- Markdown 导出
- 导入并合并/覆盖

### Sprint 4：边界与测试

- 跨节点选区处理
- 重复文本恢复处理
- SPA 页面切换处理
- 单元测试和 E2E 测试

## 11. 未来扩展位

如果二期要继续扩展，建议预留：

- 多颜色高亮
- 标注备注
- 页面级搜索
- 全局管理页
- 标签系统
- 云同步
- Firefox 兼容层

## 12. 最小初始化文件清单

如果你下一步要开始搭项目，建议先生成这些文件：

- `package.json`
- `tsconfig.json`
- `wxt.config.ts`
- `entrypoints/background.ts`
- `entrypoints/content.ts`
- `entrypoints/popup/main.ts`
- `entrypoints/popup/App.vue`
- `src/shared/types/annotation.ts`
- `src/shared/types/message.ts`
- `src/shared/constants/storageKeys.ts`
- `src/modules/annotations/repository/annotationRepository.ts`
- `src/modules/export/jsonExporter.ts`
- `src/modules/export/markdownExporter.ts`

这套文件足够支撑第一轮 MVP 骨架搭建。