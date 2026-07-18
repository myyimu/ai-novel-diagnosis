---
title: 故事体检落地实施与 AI 开发指挥计划
status: in-progress
version: 1.2.0
last_updated: 2026-07-18
workspace: /Users/yimu/work/ai-novel-diagnosis
machine_plan: ./execution-plan.yaml
contract: ./model-protocol.md
product_design: ./README.md
product_doctrine: ../product-doctrine.md
---

# 故事体检落地实施与 AI 开发指挥计划

## 1. 文档用途

本文档是“剧情漏洞、时间冲突、人设一致性、剧情结构图表、人物弧光、对话占比”等能力的工程实施总指挥。它的目标不是堆指标，而是把整书编辑判断蒸馏成作者可理解、可确认、可改稿、可复诊的事实层。

其他 AI 开始开发前必须按顺序阅读：

1. 根目录 `AGENTS.md`。
2. [`../product-doctrine.md`](../product-doctrine.md)。
3. 本文档。
4. [`model-protocol.md`](./model-protocol.md)。
5. [`README.md`](./README.md)。
6. [`execution-plan.yaml`](./execution-plan.yaml)。

发生冲突时，优先级为：`AGENTS.md > product-doctrine.md > implementation-plan.md > model-protocol.md > README.md > execution-plan.yaml`。

## 2. 一句话目标

在不削弱快速编辑初筛的前提下，把现有整书 Map-Reduce 升级为编辑事实层：统计由程序计算，冲突由规则提出，模型只复核候选，作者决定是否属于问题；确认后的问题进入修改计划、真实正文版本和独立复诊，最终沉淀可复用编辑方法。

## 3. 当前实施状态

当前本地文档已恢复到可继续实施的计划态；代码实现状态需由领取任务的 AI 在动手前重新验收，不能沿用历史聊天结论。

| 任务 | 状态 | 说明 |
| --- | --- | --- |
| SIA-001 | 待重新验收 | 共享契约与确定性对话统计；若代码已存在，先跑 ai-core 质量门再标记完成 |
| SIA-002 | 待重新验收 | 任务用途、profiles 与缓存版本；需确认 API/Web 是否实际传参与恢复 |
| SIA-003 | 待重新验收 | 项目关联和人工复核持久化；需确认迁移、repository、HTTP/E2E |
| SIA-004 | 待重新验收 | Story Audit 接入现有 BookAnalysisJob；需确认失败降级和 partial 语义 |
| SIA-005 | 当前优先任务 | 章节 Map 原子事实扩展；下一步应完善事件、事实、证据锚点和覆盖率语义 |
| SIA-006 ～ SIA-012 | 未开始或待验收 | 不得越过 SIA-005/SIA-004 的事实层直接做 UI 大屏 |

领取任务前必须运行 `git status --short`，确认当前未提交内容归属。不要把其他人的文档恢复或业务代码混进同一提交。

## 4. 当前代码事实

### 4.1 工作区

`one.manifest.json` 是结构真相，当前为 One v1 单仓：

| 项目 | 目录 | 技术 | 职责 |
| --- | --- | --- | --- |
| ai-core | `packages/ai-core` | TypeScript + Vitest + tsdown | 公共契约、纯统计、纯规则 |
| api | `services/api` | NestJS + Drizzle + Jest | 整书任务、模型调用、证据校验、持久化 |
| web | `apps/web` | Next.js + React | 导入分流、故事体检页、人工复核、复诊 |
| desktop | `apps/desktop` | Electron | 复用 Web/API，不增加独立业务实现 |

不得手改受 One 管理的 `AGENTS.md`、`CLAUDE.md` 或 `one.manifest.json` 来完成本功能。

### 4.2 复用优先级

故事体检不得新建一套平行整书分析。优先复用：

| 当前能力 | 复用方式 |
| --- | --- |
| `TextPreprocessorService` | 唯一标准化文本、章节 ID 和 offset 来源 |
| `BookAnalysisJobService` | 唯一整书异步任务、进度、恢复和结果持久化系统 |
| `chapterMaps` | 扩展场景、事件、事实字段，不建立重复 audit map |
| `sourceAnchors` / `chunkEvidenceIndex` | finding 跳转与证据回查，不另建全文索引 |
| `BookAnalysisResult` | `storyAudit` 嵌入现有结果，不新增平行缓存 |
| workspace project/revision/methodology | 作者确认、修改计划、复诊和方法沉淀 |

## 5. 不可更改的架构决策

### 5.1 一套任务、一份事实、多个视图

```text
现有 upload/preprocess
  -> 现有 BookAnalysisJob
  -> 扩展后的 chapterMaps + sourceAnchors
  -> StoryAuditOrchestrator
  -> BookAnalysisResult.storyAudit
  -> /project/health 多视图
```

禁止创建：

- 第二套 StoryAuditJob。
- 第二套整书缓存。
- 第二套人物图谱或时间线真相。
- 与 `chunkEvidenceIndex` 重复的全文索引。

### 5.2 统计、规则、模型、人工分层

| 层 | 允许做什么 | 禁止做什么 |
| --- | --- | --- |
| deterministic statistics | 对话占比、章节覆盖、证据定位率 | 给作品质量总分 |
| rule candidates | 时间环、事实冲突、先用后得等候选 | 在 partial 输入上输出全书结论 |
| verifier model | 复核候选和替代解释 | 自由审稿、重新发明 finding |
| human review | 作者确认问题或创作意图 | 覆盖不可变模型结果 |

## 6. SIA 任务包

### SIA-001：共享契约与确定性对话统计

目标：建立不依赖模型的第一块可信能力。

文件重点：

- `packages/ai-core/src/story-audit.ts`
- `packages/ai-core/src/dialogue-statistics.ts`
- `packages/ai-core/src/index.ts`

验收：

- 四类引号、嵌套、跨段、未闭合、书名号、排除类型均有测试。
- `StoryAuditFinding` 与 `StoryAuditFindingReview` 分离。
- ai-core `typecheck`、`lint`、`test`、`build` 全过。

### SIA-002：任务用途、profiles 与缓存版本

依赖：SIA-001。

目标：区分“我的作品”和“参考作品”，避免把学习样本当待修改稿。

验收：

- 旧请求默认 `reference-study`。
- `own-draft` 默认 profiles 为 `statistics + continuity + structure + character`。
- 非法 purpose/profile 返回 400。
- 缓存键包含 purpose、profiles、schemaVersion、promptVersion。

### SIA-003：项目关联和人工复核持久化

依赖：SIA-002。

目标：项目可恢复对应整书任务，人工复核状态独立持久化。

验收：

- `WorkspaceProject` 可恢复 `bookJobId` 和 `analysisPurpose`。
- finding review 可按 `(projectId, auditId, findingId)` 幂等 upsert。
- `StoryAuditResult` 不保存人工 `reviewState`。
- 有 repository、service、controller 与 HTTP/E2E 验收。

### SIA-004：故事体检纵切接入现有 BookAnalysisJob

依赖：SIA-001、SIA-002。

目标：不增加新任务端点，把故事体检嵌入现有整书任务结果。

验收：

- 不增加新任务系统或轮询端点。
- 结果嵌入 `BookAnalysisResult.storyAudit`。
- 模型失败时 coverage 和对话统计仍可返回。
- partial coverage 正确，不伪装全书完成。

### SIA-005：章节 Map 原子事实扩展

依赖：SIA-004。

目标：在现有 chapterMaps 上补场景、事件、事实和证据短引文，为时间冲突、人设一致性和剧情漏洞规则打底。

实施要求：

1. 兼容扩展现有 chapter map，不创建内容重复的 audit map。
2. Map 只处理当前可见章节，不推断不可见全文。
3. 模型返回的 quote 必须由服务端在章节正文中回查。
4. offset 必须由服务端根据标准化正文计算，不能信任模型 offset。
5. `explicit-text` 事实没有有效证据锚点时必须丢弃或降级，不能进入显式事实层。
6. coverage、sceneExtractionRate、evidenceValidationRate 必须来自真实处理结果。
7. 旧整书分析 fixture、导出和搜索保持兼容。

建议文件：

- `services/api/src/modules/book/book-analysis.service.ts`
- `services/api/src/modules/book/book-analysis.service.spec.ts`
- `services/api/src/modules/story-audit/story-audit.service.ts`
- `services/api/src/modules/story-audit/story-audit.service.spec.ts`

验收命令：

```bash
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api build
```

### SIA-006：全局时间图与冲突规则

依赖：SIA-005。实现线性时间、倒叙、before/after 环、年龄矛盾、同时异地等候选规则。unknown 时间不得强制日期化。

状态：已完成最小规则纵切。当前由服务端基于已验证事件证据构建 `temporalGraph`，并只输出 `candidate` finding，保留倒叙、梦境、预言、转述、角色撒谎和实体误合并等替代解释。

### SIA-007：候选复核器

依赖：SIA-006。Verifier 只接收候选、局部上下文和相关 canon，不自由审稿；未知 anchorId 必须被拒绝。

### SIA-008：首个可发布 Web 纵切

依赖：SIA-003、SIA-004、SIA-007。新增 `/project/health`，支持总览、一致性、文本统计、finding inspector 和人工复核。

### SIA-009：剧情结构视图

依赖：SIA-005、SIA-008。复用 plotlines、chronicle、chapterFunctionTable、foreshadowingLedger 和 `book-comprehension.ts`。

### SIA-010：人物状态与人物弧光

依赖：SIA-005、SIA-008。先做人物账本，再做 goalDistance、agency、belief、relationship、cost/choice 多维序列。

### SIA-011：剧情漏洞候选

依赖：SIA-007、SIA-009、SIA-010。只输出候选和证据，不自动判定作品“有硬伤”。

### SIA-012：复诊、导出、评测与发布

依赖：SIA-008～SIA-011。finding 进入修改计划，保存作者决定、V1/V2、实际采用项和独立复诊；导出 Markdown/JSON storyAudit 分区。

## 7. 每个 AI 的执行协议

每个任务完成后必须交接：

```text
Task ID:
实现结果:
修改文件:
契约变化:
测试命令与结果:
未解决风险:
解锁的下一任务:
```

禁止：

- 混合多个 SIA 任务提交。
- 使用 `git add -A`。
- 把模型自然语言直接写入数据库或 UI。
- 用分数替代 finding、证据和人工复核。
- 用同模型自写自评、缓存重放或工程 fixture 宣称改稿有效。

## 8. 质量门

每个代码任务至少运行所属项目质量门。涉及公共契约时还要运行 ai-core、api、web 的相关测试。

```bash
pnpm --filter @ai-novel-diagnosis/ai-core typecheck
pnpm --filter @ai-novel-diagnosis/ai-core test
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
pnpm --filter web check
pnpm --filter web test
```

若任何质量门失败，文档状态只能标记为 partial 或 in-progress，不得写 completed。

## 9. 完成定义

故事体检 MVP 完成必须满足：

- 快速诊断单章主流程未被故事体检语义污染。
- 我的作品与参考作品共用基础设施但结果路径正确。
- 统计可复算，finding 有证据，人工复核独立持久化。
- partial、旧 job、模型失败和证据失败有显式降级。
- 项目、真实正文版本、作者决定、独立复诊、方法沉淀和导出形成完整闭环。
- 工程 Golden 通过，独立编辑隐藏集达到默认展示门槛。
