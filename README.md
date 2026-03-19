# 明彩

明彩是一个基于 WXT + Vue 3 + TypeScript 的浏览器扩展项目，目标是在网页中提供“划词高亮 + 本地持久化 + 导入导出”的最小可用闭环。

当前工程已经具备以下基础能力：

- 页面划词后创建高亮的主链路
- 本地存储高亮并在页面刷新后恢复
- Popup 中查看当前页高亮摘要与列表
- 导出为 JSON / Markdown
- 从 JSON 文本导入并合并到本地存储
- 基础类型系统、消息协议与单元测试

## 技术栈

- WXT
- Vue 3
- TypeScript
- webextension-polyfill
- Vitest

## 目录概览

```text
明彩/
	entrypoints/     扩展入口：background、content、popup
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

当前版本更偏向 MVP 骨架，重点在验证主链路和模块边界，而不是完整产品体验。

已覆盖的模块包括：

- Popup 基础界面与状态管理
- Background 右键菜单注册与消息分发
- Content Script 页面高亮恢复与选区观察
- Annotation 仓储层与导入导出模块
- JSON / Markdown 导出器
- 基础单元测试样例

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
- Content Script 不直接处理下载逻辑
- 浏览器 API 尽量通过适配层或消息层封装
- 导出逻辑应保持可测试，不依赖浏览器环境
- 核心业务逻辑优先放在 `src/modules/` 中，而不是入口文件中

## 后续建议

1. 完善跨节点 Range 的序列化与恢复策略
2. 增加恢复失败时的降级匹配逻辑
3. 为 Popup 增加删除单条高亮能力
4. 为导入流程增加“合并 / 替换”切换 UI
5. 补全真实浏览器端到端测试