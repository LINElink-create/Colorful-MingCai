# 明彩

明彩是一个基于 WXT + Vue 3 + TypeScript 的浏览器扩展项目，围绕“网页划词高亮 + 本地持久化 + 导入导出 + 历史总览”构建。

当前版本已经具备以下能力：

- 页面划词后直接弹出颜色浮层，支持黄、绿、蓝、粉四种高亮颜色
- 右键菜单支持“高亮选中文本”和“取消选中区域高亮”
- 高亮内容保存到本地，并在页面刷新、重新进入、部分动态页面更新后恢复
- Popup 中查看当前页高亮摘要与列表
- Popup 中删除单条高亮，并带确认弹层
- Popup 中清空当前页全部高亮，并在完成后自动刷新页面
- 通过历史总览页查看所有已标记网页及摘录，并支持打开原网页与删除单条标记
- 导出为 JSON / Markdown
- 从 JSON 文本导入并合并到本地存储
- 基础类型系统、消息协议与单元测试

## 技术栈

- WXT
- Vue 3
- TypeScript
- webextension-polyfill
- Vitest
- Manifest V3

## 目录概览

```text
明彩/
	entrypoints/     扩展入口：background、content、popup、history
	src/features/    面向入口场景的编排逻辑
	src/modules/     领域模块：annotations、export、browser、messaging
	src/shared/      共享常量、类型与工具函数
	tests/           单元测试与 E2E 占位测试
	docs/            架构设计与实现蓝图
```

更详细的模块拆分与设计说明见 `docs/architecture-plan.md`。

如果你想按调用链阅读源码，建议同时查看 `docs/source-reading-guide.md`。

## 本地开发

先安装依赖：

```bash
npm install
```

启动开发模式：

```bash
npm run dev
```

说明：

- WXT 会启动扩展开发流程并生成临时构建产物
- 运行过程中通常会生成 `.wxt/` 与 `.output/` 等目录
- 这两个目录属于工具生成产物，不应手工修改，也通常不提交到版本控制

## 常用命令

```bash
npm run dev
npm run build
npm run zip
npm run typecheck
npm run test:unit
```

命令用途：

- `npm run dev`：启动本地开发模式
- `npm run build`：构建生产版本
- `npm run zip`：打包扩展发布压缩包
- `npm run typecheck`：执行 TypeScript 类型检查
- `npm run test:unit`：运行 Vitest 单元测试

## 构建产物

构建完成后，WXT 会将输出写入 `.output/` 目录。

这个目录通常包含：

- 构建后的扩展文件
- 清单与静态资源
- 浏览器目标对应的打包结果

如果需要重新生成，可以直接删除 `.output/` 后再次运行：

```bash
npm run build
```

## 当前实现范围

当前版本仍然以 MVP 为边界，但主链路已经不只是“骨架”，而是包含了可直接验证的完整交互闭环。

已覆盖的模块包括：

- Popup 当前页摘要、单条删除、清空确认、历史总览入口
- History 页面：全局站点分组浏览、打开原网页、删除单条标记
- Background 右键菜单注册与消息分发
- Content Script 页面高亮恢复、选区浮层、按选区删除高亮
- Annotation 锚点序列化、恢复、渲染与仓储模块
- JSON / Markdown 导出器与导入模块
- 基础单元测试样例

## 主要交互入口

### Popup

- 刷新当前页信息
- 导出全部高亮
- 导入高亮数据
- 打开历史总览页
- 查看当前页摘录
- 删除当前页某一条高亮
- 清空当前页全部高亮

### 页面内交互

- 划词后直接出现颜色浮层
- 右键菜单快速高亮
- 右键菜单取消选中区域高亮

### 历史总览页

- 按页面分组展示历史摘录
- 查看摘录颜色和创建时间
- 打开原网页
- 删除单条历史标记

## 测试状态

当前已接入：

- 3 个单元测试
- 1 个跳过的 E2E 占位测试

运行测试：

```bash
npm run test:unit
```

## 开发约束

项目当前遵循以下约束：

- Popup 不直接操作页面 DOM 选区
- History 页面不直接操作页面 DOM，而是通过 tabs 与 content message 间接同步
- Content Script 不直接处理下载逻辑
- 浏览器 API 尽量通过适配层或消息层封装
- 导出逻辑应保持可测试，不依赖浏览器环境
- 核心业务逻辑优先放在 `src/modules/` 中，而不是入口文件中

## 后续建议

1. 为历史总览页增加删除确认与搜索/筛选
2. 强化复杂页面和重复文本场景下的恢复稳定性
3. 为导入流程增加“合并 / 替换”切换 UI
4. 为 Popup 和历史总览增加颜色筛选或标签搜索
5. 补全真实浏览器端到端测试