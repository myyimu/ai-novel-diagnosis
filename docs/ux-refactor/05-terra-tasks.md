# 前端 UX 重构：Terra 执行任务拆分

日期：2026-07-10

## 执行说明

这些任务按顺序执行。每个任务只解决一个主要问题。没有完成前置依赖时，不应跳到后续任务。除非任务明确要求，不修改业务规则、API 参数含义、诊断算法、缓存策略或数据持久化语义。

## T00：冻结现状基线

任务目标：补齐当前行为、截图、路由和测试基线，作为后续回归依据。

前置依赖：无。

需要查看或修改的具体文件：

- 查看：`apps/web/src/app/**/page.tsx`
- 查看：`apps/web/src/components/workspace/**`
- 查看：`apps/web/src/components/novel-critique-console.tsx`
- 查看：`apps/web/src/hooks/use-workspace-handlers.ts`
- 修改：`docs/ux-refactor/01-current-state.md`
- 修改：`docs/ux-refactor/evidence/screenshots/*`

不允许修改的内容：业务组件、store、API 调用、路由行为。

预计产生的组件、路由或状态变化：无。

可验证的验收标准：

- 每个主要 workspace 至少有一张桌面截图；
- 快速诊断完成流有空态、输入态、错误态、结果态截图；
- 当前失败或通过的检查命令已记录；
- 已标记所有不确定信息。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交新增截图清单和命令结果摘要。

出现以下情况必须停止并报告：无法启动本地页面；关键路径无法访问；截图与页面实际状态不一致；外部模型服务故障导致无法验证本地演示以外的流程。

## T01：增加路由和导航归属测试

任务目标：锁定 URL、workspace、左侧任务导航、legacy view、默认面板之间的映射。

前置依赖：T00。

需要查看或修改的具体文件：

- 查看：`apps/web/src/lib/workspace-routes.ts`
- 查看：`apps/web/src/components/workspace/workspace-nav.tsx`
- 查看：`apps/web/src/components/workspace/workspace-nav-store.ts`
- 修改：`apps/web/src/lib/workspace-routes.test.ts` 或现有相邻测试文件

不允许修改的内容：路由实际跳转、页面 UI、业务 store。

预计产生的组件、路由或状态变化：无，仅测试。

可验证的验收标准：

- `/diagnose/quick`、`/diagnose/deep`、`/diagnose/score`、`/diagnose/evidence` 的当前映射被测试覆盖；
- `/project/*`、`/research/*`、`/settings/*` 至少覆盖一个代表路由；
- 测试明确记录哪些路由目前共享同一 legacy view。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交测试覆盖表，不需要新截图。

出现以下情况必须停止并报告：测试需要改变路由行为才能通过；发现同一路由在代码和运行时映射不一致。

## T02：建立新页面外壳契约

任务目标：新增任务驱动 workspace 外壳，不接入业务页面。

前置依赖：T01。

需要查看或修改的具体文件：

- 查看：`apps/web/src/components/workspace/WorkspaceLayout.tsx`
- 查看：`apps/web/src/components/workspace/ThreeColumnWorkspaceShell.tsx`
- 修改或新增：`apps/web/src/components/workspace/WorkspaceTaskFrame.tsx`
- 修改或新增：`apps/web/src/components/workspace/TaskNav.tsx`
- 修改或新增：`apps/web/src/components/workspace/ContextInspector.tsx`
- 修改或新增：相关 `.test.tsx`

不允许修改的内容：`use-workspace-handlers.ts`、`workspace-store.ts`、诊断 API、页面路由。

预计产生的组件、路由或状态变化：

- 新增 shell 组件；
- 新增可关闭的 inspector 组件；
- 不替换现有页面。

可验证的验收标准：

- 外壳可在 story/test harness 中渲染左、中、右三区；
- 没有右侧内容时不占用主内容宽度；
- 主内容区在移动端单列显示；
- 无 `any` 新增。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交外壳在桌面、平板、移动端的截图。

出现以下情况必须停止并报告：需要重写现有三栏才能让新外壳存在；需要引入新 UI 框架；需要改变业务 store。

## T03：实现响应式布局规则

任务目标：让新外壳在桌面、平板、移动端具备明确降级方式。

前置依赖：T02。

需要查看或修改的具体文件：

- 修改：`apps/web/src/components/workspace/WorkspaceTaskFrame.tsx`
- 修改：`apps/web/src/components/workspace/TaskNav.tsx`
- 修改：`apps/web/src/components/workspace/ContextInspector.tsx`
- 修改：相关测试

不允许修改的内容：页面业务内容、API、store 数据含义。

预计产生的组件、路由或状态变化：

- 左侧导航支持折叠或 drawer；
- 右侧 inspector 在平板变 overlay，移动端变 bottom sheet 或全屏详情；
- 布局状态仅为 UI 状态。

可验证的验收标准：

- 1440px、1024px、768px、390px 都可看到主任务区；
- 390px 无横向滚动依赖；
- 关闭 inspector 后焦点回到触发元素；
- 左右区域不会遮挡主 CTA。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交四个视口截图和键盘路径说明。

出现以下情况必须停止并报告：移动端需要删除核心内容才能显示；overlay 与现有弹窗/Toast 冲突；无法实现焦点恢复。

## T04：收敛 workspace 导航来源

任务目标：让顶部 workspace、左侧任务导航和 URL 使用同一 route meta 适配层。

前置依赖：T01、T02。

需要查看或修改的具体文件：

- 修改：`apps/web/src/lib/workspace-routes.ts`
- 修改：`apps/web/src/components/workspace/workspace-nav.tsx`
- 修改：`apps/web/src/components/workspace/workspace-local-nav.tsx` 或现有左侧导航组件
- 修改：相关测试

不允许修改的内容：页面业务内容、诊断流程、项目数据。

预计产生的组件、路由或状态变化：

- 当前工作区的左侧导航只显示当前 workspace 内任务；
- 旧高级菜单不再与顶部 workspace 导航重复；
- 兼容路由继续可访问。

可验证的验收标准：

- 每个路由只有一个当前导航项；
- `aria-current="page"` 正确；
- 浏览器刷新后导航状态来自 URL，而不是上次点击状态；
- 路由测试通过。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交四个 workspace 的导航截图。

出现以下情况必须停止并报告：需要删除兼容路由；顶部和左侧导航对同一路由无法达成一致；刷新后状态丢失。

## T05：迁移快速诊断输入态

任务目标：将 `/diagnose/quick` 的空态和输入态迁移到新主工作区。

前置依赖：T02、T03、T04。

需要查看或修改的具体文件：

- 查看：`apps/web/src/components/novel-critique-console.tsx`
- 查看：`apps/web/src/components/workspace/tabs/InputTab.tsx`
- 查看：`apps/web/src/hooks/use-workspace-handlers.ts`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickDiagnosisPage.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickDiagnosisCompose.tsx`
- 修改：`apps/web/src/app/diagnose/quick/page.tsx`
- 修改：相关测试

不允许修改的内容：请求参数含义、输入校验业务规则、示例章节数据、provider 逻辑。

预计产生的组件、路由或状态变化：

- `/diagnose/quick` 可使用新外壳展示输入态；
- 输入表单仍调用现有 handler；
- 高级设置默认折叠。

可验证的验收标准：

- 可粘贴章节、选择题材、选择输入类型、使用示例；
- 小于最小字数时保持现有提示含义；
- 共享算力/本地演示 provider 状态显示正确；
- 未产生新业务状态字段。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交空态、示例填充态、移动端输入态截图。

出现以下情况必须停止并报告：需要改 API DTO；需要绕过现有 handler；现有示例或校验行为改变。

## T06：迁移快速诊断运行态和错误态

任务目标：在新快速诊断页中承接运行中和错误反馈。

前置依赖：T05。

需要查看或修改的具体文件：

- 修改：`apps/web/src/components/workspace/quick/QuickDiagnosisPage.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickDiagnosisStatus.tsx`
- 查看：`apps/web/src/lib/quick-review-errors.ts`
- 修改：相关测试

不允许修改的内容：后端错误码、provider 配置含义、请求重试策略。

预计产生的组件、路由或状态变化：

- 运行中状态成为主工作区内明确状态；
- 错误信息使用可读摘要；
- 不直接渲染外部服务 HTML。

可验证的验收标准：

- 运行中按钮禁用和状态文案正确；
- 521/HTML 错误不会原样显示到页面；
- 错误后用户可以调整 provider 或重试；
- 本地演示仍可完成。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交运行态和错误态截图。

出现以下情况必须停止并报告：需要改变后端响应格式；错误被吞掉无法定位；错误处理影响其他 API。

## T07：迁移快速诊断结果态

任务目标：结果产生后，将报告作为主内容，输入区折叠为本次稿件摘要。

前置依赖：T06。

需要查看或修改的具体文件：

- 查看：`apps/web/src/components/workspace/tabs/InputTab.tsx`
- 查看：`apps/web/src/components/workspace/tabs/ResultsTab.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickDiagnosisReport.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickInputSummary.tsx`
- 修改：相关测试

不允许修改的内容：诊断结果字段含义、Prompt 文案生成规则、历史保存规则、方法论生成规则。

预计产生的组件、路由或状态变化：

- 报告态取代输入表单成为主内容；
- 输入摘要可展开编辑；
- 主 CTA 包括复制 Prompt、重新诊断、进入深度质检。

可验证的验收标准：

- 本地演示完整结果可显示；
- 分数、最大问题、证据、修改动作、Prompt 内容与旧结构一致；
- 复制 Prompt 功能可用；
- 结果态移动端不需要跨列寻找操作。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交桌面结果态、移动端结果态、复制 Prompt 验证说明。

出现以下情况必须停止并报告：结果字段丢失；Prompt 与旧结构不一致；历史/方法论写入行为变化。

## T08：接入快速诊断上下文检查器

任务目标：把快速诊断中的证据、历史条目、方法论卡详情迁移到条件式 inspector。

前置依赖：T07。

需要查看或修改的具体文件：

- 修改：`apps/web/src/components/workspace/ContextInspector.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickEvidenceDetail.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/QuickHistoryDetail.tsx`
- 修改或新增：`apps/web/src/components/workspace/quick/MethodologyCardDetail.tsx`
- 修改：相关测试

不允许修改的内容：历史数据写入、方法论卡生成、证据字段含义。

预计产生的组件、路由或状态变化：

- 点击证据/历史/方法论卡打开 inspector；
- 未选择对象时右侧隐藏；
- 移动端使用 bottom sheet 或详情页。

可验证的验收标准：

- inspector 可打开、关闭、恢复焦点；
- 每个详情对象标题明确；
- 主内容宽度不会因空 inspector 被挤压；
- 键盘可完成打开和关闭。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交三个详情对象的桌面和移动端截图。

出现以下情况必须停止并报告：详情对象需要新业务数据；移动端 sheet 与现有弹窗冲突；焦点管理无法稳定。

## T09：迁移深度质检步骤结构

任务目标：把深度质检表达为参考资料、评分标准、评分结果的顺序步骤。

前置依赖：T04、T08。

需要查看或修改的具体文件：

- 查看：`apps/web/src/components/workspace/tabs/DiagnosisTab.tsx`
- 查看：`apps/web/src/hooks/use-workspace-handlers.ts`
- 修改或新增：`apps/web/src/components/workspace/deep/DeepDiagnosisPage.tsx`
- 修改或新增：`apps/web/src/components/workspace/deep/DeepDiagnosisStepper.tsx`
- 修改：`apps/web/src/app/diagnose/deep/page.tsx`
- 修改：相关测试

不允许修改的内容：rubric 生成规则、评分规则、参考资料字段含义。

预计产生的组件、路由或状态变化：

- `/diagnose/deep` 显示步骤器；
- 未生成 rubric 时不能直接评分；
- 结果证据使用 inspector。

可验证的验收标准：

- 参考资料缺失时提示清楚；
- rubric 完成后才能进入评分；
- 评分结果和证据字段与旧结构一致；
- `/diagnose/deep` 刷新后状态恢复策略明确。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交三步状态截图和依赖阻断说明。

出现以下情况必须停止并报告：需要改变 scoring/rubric API；兼容路由无法映射；旧结果无法展示。

## T10：处理 `/diagnose/score` 与 `/diagnose/evidence` 兼容入口

任务目标：明确 score/evidence 是独立页面、步骤锚点还是详情视角，并实现兼容。

前置依赖：T09。

需要查看或修改的具体文件：

- 修改：`apps/web/src/app/diagnose/score/page.tsx`
- 修改：`apps/web/src/app/diagnose/evidence/page.tsx`
- 修改：`apps/web/src/lib/workspace-routes.ts`
- 修改：相关测试

不允许修改的内容：评分结果含义、证据内容、旧 URL 可访问性。

预计产生的组件、路由或状态变化：

- 旧 URL 进入深度质检对应步骤或结果视角；
- 无前置数据时给出明确恢复路径；
- 不再伪装成平级主任务。

可验证的验收标准：

- 直接访问 `/diagnose/score` 不会显示空白或错误任务；
- 直接访问 `/diagnose/evidence` 有明确上下文缺失提示；
- 导航当前态正确；
- 测试覆盖刷新场景。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
```

完成后需要提交的截图或说明：提交两个兼容 URL 的截图。

出现以下情况必须停止并报告：产品需要它们作为真正独立任务但当前数据不足；兼容跳转会丢失用户数据。

## T11：迁移项目工作区代表页

任务目标：让项目工作区只承载项目上下文、改稿方案、方法论和导出，不混入诊断主表单。

前置依赖：T08。

需要查看或修改的具体文件：

- 修改：`apps/web/src/app/project/current/page.tsx`
- 修改：`apps/web/src/app/project/revisions/page.tsx`
- 修改：`apps/web/src/app/project/methodology/page.tsx`
- 修改：`apps/web/src/app/project/export/page.tsx`
- 修改或新增：`apps/web/src/components/workspace/project/*`
- 修改：相关测试

不允许修改的内容：项目保存规则、revision session、methodology card 数据结构、导出数据含义。

预计产生的组件、路由或状态变化：

- 项目页显示当前项目和资产；
- 改稿方案、方法论、导出各自成为清晰任务；
- 详情进入 inspector。

可验证的验收标准：

- 从快速诊断生成的 revision/methodology 能在项目页看到；
- 项目切换仍清理或保留旧状态的行为与当前一致；
- 导出内容不变；
- 移动端可完成查看和复制。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交项目概览、改稿方案、方法论、导出页面截图。

出现以下情况必须停止并报告：项目切换语义不清；导出依赖旧页面 DOM；revision 数据与诊断结果对应关系不稳定。

## T12：迁移研究工作区代表页

任务目标：把整书拆解和研究能力从三栏混合视图迁移为独立研究任务。

前置依赖：T08、T11。

需要查看或修改的具体文件：

- 修改：`apps/web/src/app/research/book/page.tsx`
- 修改：`apps/web/src/app/research/compare/page.tsx`
- 修改：`apps/web/src/app/research/patterns/page.tsx`
- 修改：`apps/web/src/app/research/materials/page.tsx`
- 修改或新增：`apps/web/src/components/workspace/research/*`
- 修改：相关测试

不允许修改的内容：整书任务 API、文件解析规则、轮询策略、图谱数据含义。

预计产生的组件、路由或状态变化：

- 整书拆解成为上传、预览、运行、结果步骤；
- 历史任务作为研究任务内列表或独立入口；
- 图谱节点详情使用 inspector。

可验证的验收标准：

- 上传/文本输入预览可用；
- 异步任务进度可见；
- 结果视角与旧数据一致；
- 小屏可完成上传和查看状态。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交上传、预览、任务进度、结果页截图。

出现以下情况必须停止并报告：文件处理需要后端变更；任务轮询和页面生命周期冲突；大文件导致测试不可控。

## T13：整理设置工作区

任务目标：把 AI provider、输入偏好和低频设置归入设置页，不再作为右栏常驻 Tab。

前置依赖：T04。

需要查看或修改的具体文件：

- 修改：`apps/web/src/app/settings/provider/page.tsx`
- 修改：`apps/web/src/app/settings/input/page.tsx`
- 修改：`apps/web/src/app/settings/ai-settings/page.tsx`
- 修改或新增：`apps/web/src/components/workspace/settings/*`
- 修改：相关测试

不允许修改的内容：provider 配置字段、API Key 存储策略、模型选择业务规则。

预计产生的组件、路由或状态变化：

- 设置页独立承载模型服务配置；
- 任务页只显示当前模型状态和跳转入口；
- `provider` 与 `ai-settings` 的边界被明确，必要时保留兼容跳转。

可验证的验收标准：

- 可切换本地演示/共享算力/其他已有 provider；
- 回到快速诊断后模型状态正确；
- API Key 不被日志或截图泄露；
- 设置页移动端可用。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交 provider 设置页和快速诊断模型状态截图。

出现以下情况必须停止并报告：provider 状态跨页不同步；需要改变密钥存储；兼容路由会暴露敏感信息。

## T14：状态归属和持久化清理

任务目标：将布局/UI 状态与业务状态分离，减少跨路由污染。

前置依赖：T08、T10、T13。

需要查看或修改的具体文件：

- 查看：`apps/web/src/stores/workspace-store.ts`
- 查看：`apps/web/src/components/workspace/workspace-layout-store.ts`
- 修改或新增：`apps/web/src/stores/workspace-ui-store.ts`
- 修改：相关测试

不允许修改的内容：业务结果、项目、历史、provider、reference、rubric、score 的数据结构含义。

预计产生的组件、路由或状态变化：

- inspector、折叠、步骤、导航展开等进入 UI store；
- 旧 localStorage key 兼容读取；
- route-scoped layout 状态不互相污染。

可验证的验收标准：

- 刷新后业务数据不丢失；
- 从 quick 切到 settings 再回来，不会恢复无关右栏 Tab；
- 清空 UI store 不影响业务结果；
- 持久化测试覆盖旧 key。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交 localStorage 迁移说明和跨路由状态验证说明。

出现以下情况必须停止并报告：旧用户数据无法兼容；需要删除业务 key；状态迁移导致结果或项目丢失。

## T15：无障碍和键盘交互加固

任务目标：补齐导航、Tab、检查器、抽屉和错误状态的可访问性。

前置依赖：T03、T08、T14。

需要查看或修改的具体文件：

- 修改：`apps/web/src/components/workspace/**`
- 修改：`apps/web/src/components/ui/**`（仅当现有 primitive 需要补 aria）
- 修改：相关测试

不允许修改的内容：视觉重设计、业务逻辑、第三方 UI 框架引入。

预计产生的组件、路由或状态变化：

- Tab 和导航键盘行为完善；
- inspector/sheet 焦点管理完善；
- resizer 可键盘操作或被替换为离散宽度选项。

可验证的验收标准：

- Tab 键顺序符合视觉顺序；
- Escape 可关闭 inspector/sheet；
- 关闭后焦点返回触发元素；
- 200% 缩放可完成快速诊断主流程；
- 错误状态可被读屏感知。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交键盘路径录像或文字记录、200% 缩放截图。

出现以下情况必须停止并报告：现有组件库 primitive 不支持必要语义；键盘行为会破坏已有快捷键；焦点陷阱与嵌套弹窗冲突。

## T16：删除旧三栏重复结构

任务目标：在新结构覆盖关键路径后，删除不再使用的旧布局和重复 Tab。

前置依赖：T05 至 T15 全部完成，并通过验收。

需要查看或修改的具体文件：

- 查看：`apps/web/src/components/workspace/ThreeColumnWorkspaceShell.tsx`
- 查看：`apps/web/src/components/workspace/ThreeColumnWorkspace.tsx`
- 查看：`apps/web/src/components/workspace/tabs/*`
- 查看：`apps/web/src/components/novel-critique-console.tsx`
- 修改：确认无引用后的旧文件
- 修改：相关测试和文档

不允许修改的内容：任何仍被路由使用的兼容入口；业务 store；历史数据。

预计产生的组件、路由或状态变化：

- 删除未使用三栏 shell；
- 删除重复 Tab；
- 移除旧布局开关或保留为仅回滚期配置。

可验证的验收标准：

- `rg` 确认删除对象无引用；
- 所有关键路由可访问；
- 截图基线更新；
- 检查命令通过；
- 文档记录最终结构。

需要执行的测试或检查命令：

```bash
pnpm --filter web test
pnpm --filter web check
pnpm --filter web build
```

完成后需要提交的截图或说明：提交删除清单、最终路由截图、回滚说明。

出现以下情况必须停止并报告：旧组件仍被未迁移路由引用；删除后无法回滚；测试覆盖不足以证明关键路径仍可用。

