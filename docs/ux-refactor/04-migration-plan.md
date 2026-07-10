# 前端 UX 重构：增量迁移计划

日期：2026-07-10

## 迁移原则

迁移必须按用户流程推进，而不是按组件目录批量重写。第一条完整验证流选择“快速诊断”：它覆盖输入、模型状态、异步运行、错误、结果、改稿 Prompt、方法论和历史，是当前页面最典型的复杂路径。

每个阶段都必须能单独验证，并且保留回滚路径。业务规则、数据含义、API 请求结构和缓存策略不在本轮 IA 迁移中改变。

## 阶段 0：当前行为和截图基线

目标：冻结当前可见行为，防止后续把已有流程改坏。

已完成的基线材料：

- 经典布局空状态：`docs/ux-refactor/evidence/screenshots/01-classic-quick-empty-desktop.png`
- 三栏布局桌面空状态：`02-three-column-quick-empty-desktop.png`
- 三栏布局平板：`03-three-column-quick-tablet.png`
- 三栏布局移动端：`04-three-column-quick-mobile.png`
- 经典布局移动端：`05-classic-quick-mobile.png`
- 示例输入：`06-classic-quick-example-filled-desktop.png`
- 共享算力错误：`07-classic-quick-shared-provider-error-desktop.png`
- 本地演示完整结果：`08-classic-quick-result-desktop.png`
- 三栏结果输入 Tab：`09-three-column-result-input-tab-desktop.png`
- 三栏结果诊断 Tab：`10-three-column-result-diagnosis-tab-desktop.png`
- 深度质检三栏：`11-three-column-deep-route-desktop.png`

需要补充的基线：

- `pnpm --filter web test`
- `pnpm --filter web check`
- `pnpm --filter web build`
- 路由矩阵截图：每个 workspace 至少一个代表路由。
- 键盘路径记录：Tab 顺序、侧栏切换、Tab 切换、运行诊断、复制 Prompt。

退出标准：基线截图和当前失败/通过的检查结果记录到文档或测试输出中。

## 阶段 1：页面外壳与布局职责

目标：建立新的 workspace 外壳契约，但不迁移业务页面。

建议新增或调整：

- `apps/web/src/components/workspace/WorkspaceTaskFrame.tsx`
- `apps/web/src/components/workspace/TaskNav.tsx`
- `apps/web/src/components/workspace/ContextInspector.tsx`
- `apps/web/src/components/workspace/ResponsiveWorkspaceLayout.tsx`

职责：

- 外壳只负责区域和响应式；
- 左侧只接收当前 workspace 的任务导航；
- 中间接收当前路由主内容；
- 右侧接收 selected object detail；
- 外壳不调用诊断 API，不改写业务状态。

回滚：保留 `WorkspaceLayout`、`ThreeColumnWorkspaceShell` 和经典模式入口。新外壳先只在一个实验路由或开关下使用。

## 阶段 2：导航和路由调整

目标：让顶部 workspace、左侧任务导航和 URL 三者一致。

工作项：

- 将 `/diagnose/*`、`/project/*`、`/research/*`、`/settings/*` 的导航来源收敛到一个 route meta。
- 移除或隐藏与当前工作区无关的旧高级菜单。
- 为当前页面设置唯一 `aria-current="page"`。
- 对当前兼容路由建立测试：`deep`、`score`、`evidence` 当前都映射到 `view="chapter"`，先记录而不是假设它们已独立。

回滚：保留旧 `workspace-routes.ts` 映射，新增映射以适配器形式引入。

## 阶段 3：主工作区迁移：快速诊断

目标：迁移一个完整代表性用户流程。

状态拆分：

```text
compose：输入章节与必要参数
running：运行中
error：错误可恢复
report：完整诊断结果
```

UI 行为：

- 空状态只显示完成诊断所需内容；
- 高级设置默认折叠；
- 运行中显示当前模型、任务状态和取消/重试策略；
- 结果态将报告提升为主内容；
- 输入区折叠为本次稿件摘要，可展开重新编辑；
- 主 CTA 为复制 Prompt、重新诊断、进入深度质检；
- 右侧不展示全局历史，除非用户点击具体历史项或证据。

回滚：快速诊断路由保留旧组件入口，可通过开关回到经典 `overview`。

## 阶段 4：详情区域迁移

目标：把“详情/预览”从永久右栏改成条件式检查器。

优先迁移对象：

- 单条诊断证据；
- 改稿方案详情；
- 方法论卡详情；
- 单次历史诊断；
- 章节预览或整书任务详情。

交互规则：

- 点击对象打开检查器；
- 检查器标题说明对象类型；
- 关闭后焦点回到触发元素；
- 移动端使用 bottom sheet 或详情页；
- 没有对象时不占位。

回滚：保留旧右栏 Tab，但默认隐藏。必要时按路由恢复。

## 阶段 5：状态归属调整

目标：先分离 UI 状态，不急于拆业务状态。

建议：

- 业务状态继续在 `workspace-store.ts`；
- 新增 route-scoped UI store 或 adapter，保存：
  - 左侧折叠状态；
  - 当前 inspector 对象；
  - 当前任务内部折叠区；
  - 当前步骤；
  - route-scoped layout preference。
- 旧 localStorage key 保持兼容读取，但新 key 不应让一个路由的右栏 Tab 污染另一个路由。

回滚：新 UI store 可清空，不影响业务数据。

## 阶段 6：深度质检迁移

目标：把 `reference → rubric → score/evidence` 表达成有依赖关系的步骤。

工作项：

- `/diagnose/deep` 显示步骤器；
- 未生成 rubric 时，评分步骤不可直接执行；
- `/diagnose/score` 和 `/diagnose/evidence` 作为兼容入口，跳转到对应步骤或结果视角；
- 证据详情使用检查器；
- 参考资料和平台设置不常驻右栏。

回滚：保留当前 `view="chapter"` 渲染路径。

## 阶段 7：项目、研究和设置迁移

目标：在快速诊断和深度质检验证后，再迁移其余模块。

顺序：

1. 项目：当前项目、改稿方案、方法论库、导出；
2. 研究：整书上传、任务历史、样本对比、图谱/模式；
3. 设置：provider、AI 设置、输入偏好合并或明确边界。

规则：

- 项目页不再混入快速诊断表单；
- 研究页不再常驻诊断历史；
- 设置页不再出现在右栏 Tab；
- 导出和历史属于低频或回访任务，保留独立入口。

## 阶段 8：响应式处理

目标：桌面、平板和移动端都可完成完整主流程。

断点：

- `>=1280px`：任务导航 + 主内容 + 条件式检查器；
- `768px-1279px`：任务导航可折叠，检查器 overlay；
- `<768px`：单列，导航 drawer，检查器 bottom sheet 或详情页。

必须验证：

- 390px 宽度不出现横向不可达主任务；
- 1024px 宽度主内容不低于可读宽度；
- 文本不溢出按钮或 Tab；
- 200% 缩放时关键操作可见；
- 键盘可达所有主操作。

## 阶段 9：无障碍处理

目标：把当前鼠标优先的布局交互补成可键盘和读屏理解的结构。

要求：

- 唯一 `h1`；
- landmark：`header`、`nav`、`main`、`aside`；
- 左侧导航使用 `aria-current`；
- Tab 符合 WAI-ARIA 模式；
- resizer 可键盘操作或移除；
- 抽屉/检查器有焦点管理；
- 错误信息使用可读文本，不直接展示 HTML；
- loading 与完成状态有可感知反馈。

## 阶段 10：测试补充

目标：用测试锁住用户流程和路由归属。

最低测试：

- route meta 映射测试；
- 快速诊断空态、填写、运行、结果态组件测试；
- inspector 打开/关闭和焦点恢复测试；
- responsive smoke 测试；
- localStorage 兼容读取测试；
- 错误展示不渲染原始 HTML；
- 核心 store 持久化回归测试。

建议检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

## 阶段 11：旧结构删除

目标：确认新结构覆盖关键路径后，删除重复层级。

删除条件：

- 快速诊断、深度质检、项目、研究、设置的关键入口都已迁移；
- 截图基线已更新；
- 旧三栏 Tab 不再被任何路由使用；
- 经典布局已不再承担回滚职责；
- 所有检查命令通过或已有明确豁免记录。

可删除对象需在执行前再次用 `rg` 确认引用，包括：

- 未使用的三栏 shell；
- 临时 route adapter；
- 旧布局开关；
- 未使用 Sidebar/ViewHeader 并行组件；
- 旧 localStorage key 迁移代码。

## 回滚方式

每阶段都应满足以下回滚条件：

- 旧组件仍可通过开关或路由入口访问；
- 新 UI 状态不覆盖业务持久化数据；
- 数据结构变更只读兼容，不删除旧 key；
- 每次迁移只覆盖一个主要用户流程；
- 出现用户无法完成诊断、历史丢失、结果语义变化、API 请求变化时立即回滚该阶段。

