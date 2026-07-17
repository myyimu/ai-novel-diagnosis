---
title: 故事体检落地实施与 AI 开发指挥计划
status: ready-for-execution
version: 1.1.0
last_updated: 2026-07-17
workspace: E:/ai-novel-diagnosis
machine_plan: ./execution-plan.yaml
contract: ./model-protocol.md
product_design: ./README.md
---

# 故事体检落地实施与 AI 开发指挥计划

## 1. 文档用途

本文档是“剧情漏洞、时间冲突、人设一致性、剧情结构图表、人物弧光、对话占比”等能力的工程实施总指挥。它基于 2026-07-17 的当前代码，而不是理想化目录。

其他 AI 开始开发前必须按顺序阅读：

1. 根目录 `AGENTS.md`。
2. 本文档。
3. [`model-protocol.md`](./model-protocol.md)。
4. [`README.md`](./README.md)。
5. [`execution-plan.yaml`](./execution-plan.yaml)。

发生冲突时，优先级为：`AGENTS.md > implementation-plan.md > model-protocol.md > README.md > execution-plan.yaml`。

## 2. 一句话目标

在不削弱“快速诊断一章为什么没人追”的前提下，把现有整书 Map-Reduce 升级为可追溯的故事体检：统计由程序计算，冲突由规则提出，模型只复核候选，作者决定是否属于问题，确认后的问题进入现有改稿和复诊闭环。

## 3. 当前代码事实

### 3.1 工作区

`one.manifest.json` 是结构真相，当前为 One v1 单仓：

| 项目 | 目录 | 技术 | 本次职责 |
| --- | --- | --- | --- |
| ai-core | `packages/ai-core` | TypeScript + Vitest + tsdown | 公共契约、纯统计、纯规则 |
| api | `services/api` | NestJS + Drizzle + Jest | 整书任务、模型调用、证据校验、持久化 |
| web | `apps/web` | Next.js 16 + React 19 | 导入分流、故事体检页、人工复核、复诊 |
| desktop | `apps/desktop` | Electron | 复用 Web/API，不增加独立业务实现 |

One CLI 0.1.0 当前可用。不得手改受 One 管理的 `AGENTS.md`、`CLAUDE.md` 或 `one.manifest.json` 来完成本功能。

### 3.2 已有能力与可复用点

| 当前能力 | 代码位置 | 复用方式 |
| --- | --- | --- |
| 章节清洗和切分 | `services/api/src/modules/book/text-preprocessor.service.ts` | 继续作为唯一标准化文本和章节 ID 来源 |
| 异步任务、进度、恢复、部分结果 | `book-analysis-job.service.ts` | 继续作为唯一整书任务系统，不新建 StoryAuditJob |
| 章节 Map | `book-analysis.service.ts#ChapterMapResult` | 扩展原子事件/事实字段，不建立重复 audit map |
| 精确证据锚点 | `buildSourceAnchors()` | quote 回查后生成全书绝对 offset，直接复用 |
| 证据索引和搜索 | `mapReduce.chunkEvidenceIndex`、`GET /analysis/book/jobs/:jobId/search` | finding 回跳与复核上下文复用该索引 |
| 人物、关系、剧情线、时间线 | `BookAnalysisResult` | 作为实体、结构和事件种子，不复制资产 |
| 伏笔、情绪、节奏、续写守卫 | `writingSupport` | 作为结构视图和待确认 canon 候选 |
| 整书缓存 | `CachedBookAnalysis`、`workspace-cache.ts` | `storyAudit` 嵌入现有结果，不新增平行缓存 |
| 项目、复诊、方法论 | workspace API + `RevisionSession` | 人工确认问题进入现有修改闭环 |
| 关系图与理解图 | `relationship-graph.ts`、`book-comprehension.ts` | 结构页复用视图模型和证据跳转模式 |
| 整书导出 | `BookExportService` | 增加故事体检分区，不新建导出系统 |

### 3.3 当前真实缺口

1. 仓库中不存在 `StoryAudit` 代码，只有规划文档。
2. `BookAnalysisJobSnapshot.result` 仍为 `unknown`；Web 在 `workspace-store.ts` 单独维护 `BookAnalysisResult`，API/共享包没有统一契约。
3. `AnalyzeBookDto` 和上传任务 DTO 没有“我的作品/参考作品”或分析 profiles。
4. 整书缓存键只包含 provider、题材、标题和文本指纹，缺少 purpose、profiles、schemaVersion、promptVersion。
5. `WorkspaceProject` 只有 id/name/time，没有 `bookJobId`，重新打开项目无法稳定恢复对应整书任务。
6. 人工复核状态没有独立持久化位置。把它写回模型 result 会污染不可变分析结果。
7. `/project` 只有 current/revisions/methodology/export，没有故事体检入口。
8. `/research/book` 完成后只引导去图谱和资料，默认语义仍偏参考作品拆解。
9. 当前整书分析不支持真正的单章版本链，因此“增量重算”不能作为首版承诺。

## 4. 不可更改的架构决策

### 4.1 一套任务、一份事实、多个视图

```text
现有 upload/preprocess
  -> 现有 BookAnalysisJob
  -> 扩展后的 chapterMaps + sourceAnchors
  -> StoryAuditOrchestrator
  -> BookAnalysisResult.storyAudit
  -> /project/health 多视图
```

禁止新建第二套上传、任务轮询、缓存、全文索引、人物卡、关系图或时间线。

### 4.2 输入用途必须分流

新增：

```ts
type BookAnalysisPurpose = "own-draft" | "reference-study";
type StoryAuditProfile = "statistics" | "continuity" | "structure" | "character";
```

- 兼容旧请求：purpose 缺省时按 `reference-study`，保持当前行为。
- 我的作品：默认四个 profile，完成后进入 `/project/health`。
- 参考作品：保持当前研究、原创化边界和拆书资产，默认不生成漏洞警报。

### 4.3 结果与人工判断分离

`BookAnalysisResult.storyAudit` 是不可变的计算结果。模型 finding 只保存 `candidate | verified | needs_human | dismissed`。

作者的 `confirmed | author_intent | insufficient_evidence | false_positive | planned | resolved` 必须保存在独立 `StoryAuditFindingReview`，不得写回 job result。

### 4.4 三层判断不得混淆

| 层 | 例子 | 产生者 |
| --- | --- | --- |
| 确定性统计 | 对话占比、章节长度、时间图成环 | ai-core 纯函数 |
| 冲突候选 | 人物提前知道秘密、同时异地 | 规则服务 |
| 编辑判断 | 是否伤害读者理解、如何修 | verifier + 作者确认 |

不增加全书总分，不因偏离三幕式等模板自动扣分。

### 4.5 先交付纵切，再扩展指标

首个可发布版本只包含：

- 我的作品/参考作品分流。
- 对话统计。
- 时间冲突候选。
- 双侧证据回跳。
- 作者复核和加入修改计划。

结构图、人设一致性、人物弧光、剧情漏洞在同一事实层上后续加入。剧情漏洞最后做，因为误报成本最高。

## 5. 目标代码结构

```text
packages/ai-core/src/
├── story-audit.ts                    # 公共类型
├── story-audit.test.ts
├── dialogue-statistics.ts            # 无模型、无 IO 的纯解析器
└── dialogue-statistics.test.ts

services/api/src/modules/story-audit/
├── story-audit.module.ts
├── story-audit-orchestrator.service.ts
├── story-audit-orchestrator.service.spec.ts
├── story-audit-verifier.service.ts
├── story-audit-verifier.service.spec.ts
├── story-graph.service.ts
├── story-graph.service.spec.ts
├── story-structure.service.ts
├── character-ledger.service.ts
├── character-arc.service.ts
├── plot-gap-detector.service.ts
├── dto/
│   └── review-story-audit-finding.dto.ts
└── story-audit-review.controller.ts

services/api/src/dao/repositories/
└── story-audit-review.repository.ts

apps/web/src/app/project/health/
└── page.tsx

apps/web/src/components/workspace/project/story-audit/
├── StoryAuditPage.tsx
├── StoryAuditOverview.tsx
├── ContinuityPanel.tsx
├── StructurePanel.tsx
├── CharacterPanel.tsx
├── TextStatisticsPanel.tsx
└── FindingInspector.tsx
```

`BookAnalysisService` 只负责把现有 Map-Reduce 结果交给 `StoryAuditOrchestratorService`。禁止继续把图算法、人物账本和 verifier 塞进当前已经很大的 service。

## 6. 数据与迁移设计

### 6.1 共享契约

完整字段以 [`model-protocol.md`](./model-protocol.md) 为准。首版至少实现：

- `StoryAuditResult`
- `StoryAuditCoverage`
- `DialogueStatistics`
- `StoryEvent`
- `StoryFact`
- `StoryAuditFinding`
- `StoryAuditFindingReview`

`StoryAuditFinding` 不包含人工 reviewState。

### 6.2 兼容扩展

```ts
interface BookAnalysisResult {
  analysisPurpose?: BookAnalysisPurpose;
  storyAudit?: StoryAuditResult;
}

interface WorkspaceProject {
  bookJobId?: string;
  analysisPurpose?: BookAnalysisPurpose;
}

interface RevisionSession {
  storyAuditFindingIds?: string[];
}
```

旧 job、旧缓存和旧项目缺少这些字段时必须正常打开，并显示“需重新运行整书体检”，不得报错。

### 6.3 数据库迁移

必须通过 Drizzle migration 实施：

1. `workspace_projects` 增加 nullable `book_job_id`、nullable `analysis_purpose`。
2. `revision_sessions` 增加非空 JSONB `story_audit_finding_ids`，默认 `[]`。
3. 新建 `story_audit_finding_reviews`：

```text
id
project_id
book_job_id
audit_id
finding_id
review_state
note
created_at
updated_at
```

唯一键为 `(project_id, audit_id, finding_id)`。分析结果删除时不自动删除作者复核；UI 应标记其来源任务不可用，避免丢失人工判断。

数据库访问只允许 `src/dao/repositories/story-audit-review.repository.ts`。模块 service 不直接调用 Drizzle。

## 7. API 与缓存语义

### 7.1 复用现有任务端点

扩展而非新增：

- `POST /analysis/book/jobs`
- `POST /analysis/book/uploads/:uploadId/jobs`
- `GET /analysis/book/jobs/:jobId`
- `POST /analysis/book/jobs/:jobId/resume`
- `GET /analysis/book/jobs/:jobId/search`
- `GET /analysis/book/jobs/:jobId/export`

请求新增可选 `purpose` 和 `profiles`。`inputSummary` 必须保存解析后的实际值，确保任务历史可解释。

### 7.2 人工复核端点

由新的轻量 controller 提供：

```text
GET /analysis/story-audit/projects/:projectId/reviews?bookJobId=...
PUT /analysis/story-audit/projects/:projectId/findings/:findingId/review
```

PUT DTO 必须包含 `bookJobId`、`auditId`、`reviewState`，note 可选。Controller 只解析参数和调用 service。

### 7.3 缓存键

整书缓存键至少包含：

```text
cacheVersion
normalizedTextFingerprint
provider/model/baseUrl/jsonMode
genre
purpose
sortedProfiles
storyAuditSchemaVersion
extractorPromptVersion
verifierPromptVersion
```

修改 purpose 或 profiles 必须形成新任务。旧缓存不得冒充故事体检结果。

## 8. 模型与规则执行顺序

### 8.1 Map 阶段

在现有 `ChapterMapResult` 兼容增加：

```text
events[]
facts[]
characterStateDeltas[]
dialogueAtoms[]（可选；比例仍由程序复算）
```

原有 summary、plotFunction、timelineEvents、foreshadowingSetups 等字段保持兼容。模型只返回 quote，offset 继续由 `buildSourceAnchors()` 回查。

首版允许以 chapter 作为分析单元；真正 scene 切分列入人物弧光阶段，避免首版同时改写预处理器。

### 8.2 Reduce 与规则

1. 合并别名和实体，但保留低置信歧义。
2. 分开 narrativeOrder 与 storyTime。
3. 构建事件图和人物事实有效区间。
4. 程序发现时间环、年龄矛盾、知识越界、同时异地等候选。
5. 只有候选进入 verifier，禁止再次自由审完整本书。

### 8.3 Verifier

输入限制为：候选 claim、双侧局部上下文、相关 canon、图邻居。必须主动排除倒叙、梦境、预言、角色撒谎、不可靠叙述和合理成长。

每本书默认最多复核 20 个候选；超出部分按规则强度、叙事跨度、读者可见性排序，降低 token 成本。

## 9. Web 融入方案

### 9.1 整书导入

`ResearchBookPage` 增加“我的作品 / 参考作品”：

- 我的作品完成后，创建或更新当前 `WorkspaceProject.bookJobId`，主 CTA 进入 `/project/health`。
- 参考作品维持现有“查看图谱 / 查看资料”。
- 恢复历史任务时从 `inputSummary.purpose` 恢复页面语义。

### 9.2 项目导航

修改：

- `workspace-routes.ts`：`ProjectView` 增加 `health`。
- `ProjectAssetTabs.tsx`：增加“故事体检”，顺序为 current → health → revisions → methodology → export。
- 新增 `/project/health`。

不要增加顶层工作区。新组件必须使用设计 token，不复制现有硬编码颜色。

### 9.3 结果页

首屏只展示：覆盖率、是否 partial、最重要 1～3 个 finding、来源标签。内部页签：

```text
总览 | 一致性 | 结构 | 人物 | 文本统计
```

未实现的 profile 显示明确空状态，不使用 mock 结论。每个 finding 可跳到双侧原文锚点，并支持确认问题、创作意图、证据不足、误报、加入计划。

### 9.4 现有闭环

- QuickReview issues 保持“单章流失诊断”语义，只允许交叉引用 finding ID。
- planned finding 写入 `RevisionSession.storyAuditFindingIds`。
- 复诊时对比 finding 状态，不只比较 quickScore。
- 只有重复且人工 confirmed 的 finding 才能建议生成 MethodologyCard。

## 10. 实施任务包

机器依赖图见 [`execution-plan.yaml`](./execution-plan.yaml)。以下任务描述为执行真相。

### SIA-001：共享契约与确定性对话统计

目标：建立不依赖模型的第一块可信能力。

文件：

- 新建 `packages/ai-core/src/story-audit.ts`、测试。
- 新建 `packages/ai-core/src/dialogue-statistics.ts`、测试。
- 修改 `packages/ai-core/src/index.ts`。
- 新增 changeset。

验收：四类中文/半角引号、嵌套、跨段、未闭合、书名号、排除类型均有测试；相同输入结果稳定；ai-core typecheck/lint/test/build 全过。

### SIA-002：任务用途、profiles 与缓存版本

依赖：SIA-001。

文件：

- API 两个整书 DTO、`BookAnalysisJobSnapshot.inputSummary`、BookController 传参。
- Web `workspace-analysis-client.ts`、`workspace-cache.ts`、store 类型与测试。

验收：旧请求默认 reference-study；purpose/profiles 非法值返回 400；缓存键覆盖全部新语义；旧任务可打开。

### SIA-003：项目关联和人工复核持久化

依赖：SIA-002。

文件：

- Drizzle schema + migration。
- workspace project/revision DTO、repository、Web 类型。
- 新建 story audit review repository/service/controller/spec。

验收：项目可恢复 bookJobId；finding review 刷新后存在；唯一键可幂等 upsert；repository 是唯一 DB 访问层。

### SIA-004：故事体检纵切接入现有 BookAnalysisJob

依赖：SIA-001、SIA-002。

文件：

- 新建 StoryAuditModule 和 orchestrator。
- 修改 BookModule、BookAnalysisService、Web BookAnalysisResult。

首版只生成 coverage + dialogue statistics，并嵌入 `BookAnalysisResult.storyAudit`。

验收：不增加新任务端点；mock 和真实 provider 均可返回契约；模型失败时统计仍可返回；partial coverage 正确。

### SIA-005：章节 Map 原子事实扩展

依赖：SIA-004。

文件：`book-analysis.service.ts/spec.ts`、story audit coercion/validation。

验收：事件和事实只基于可见章节；所有 explicit-text 事实有有效 anchor；旧 fixture 与导出兼容；不得继续引入 `any`。

### SIA-006：全局时间图与冲突规则

依赖：SIA-005。

文件：story-graph service/spec、Golden fixtures。

验收：线性时间不误报；倒叙不误报；before/after 环、年龄矛盾、同时异地生成双证据 candidate；unknown 不强行日期化。

### SIA-007：候选复核器

依赖：SIA-006。

文件：verifier service/spec、结构化 JSON schema。

验收：未知 anchorId 被拒绝；证据不足不得 verified；每本最多复核 20 个；模型不可用时保留 candidate 并明确未复核。

### SIA-008：首个可发布 Web 纵切

依赖：SIA-003、SIA-004、SIA-007。

文件：导入分流、project health 路由、导航、总览/一致性/文本统计、FindingInspector、客户端复核 API。

验收：我的作品能从导入进入项目体检；参考作品旧流程不变；双证据可回跳；人工状态可持久化；路由和组件测试通过。

完成 SIA-001～008 即形成 MVP 发布点。

### SIA-009：剧情结构视图

依赖：SIA-005、SIA-008。

复用 plotlines、chronicle、chapterFunctionTable、foreshadowingLedger 和 `book-comprehension.ts`。输出剧情线矩阵、叙事/故事时间切换、伏笔回收边。未选择模板时不得评分。

### SIA-010：人物状态与人物弧光

依赖：SIA-005、SIA-008。

先做人物账本，再做 goalDistance、agency、belief、relationship、cost/choice 多维序列。此阶段才引入 scene 粒度；每个变化点必须有证据。

### SIA-011：剧情漏洞候选

依赖：SIA-007、SIA-009、SIA-010。

只覆盖 causal_gap、dropped_goal、unresolved_setup、world_rule_violation、ability_violation、knowledge_violation。partial 输入禁止给出“全书未回收”结论。

### SIA-012：复诊、导出、评测与发布

依赖：SIA-008～011。

- finding 进入修改计划和复诊。
- BookExportService 输出 Markdown/JSON storyAudit 分区。
- 建立至少十类人工 Golden fixtures。
- 同步 README、architecture、功能位置文档。

默认展示门槛：时间冲突高优 precision ≥ 0.85；人物/剧情漏洞高优 precision ≥ 0.70。未达标类别默认折叠，不进入顶部警报。

## 11. 每个 AI 的执行协议

领取任务后必须：

1. 只修改任务包列出的文件；发现需要扩展范围先记录，不顺手重构无关模块。
2. 开始前运行 `git status --short`，保留用户已有改动，尤其当前 `apps/web/next-env.d.ts` 的未提交修改。
3. 先写或更新测试，再实现行为。
4. 公共契约变更同步 ai-core、API、Web 和 changeset。
5. 不将模型自然语言直接写入数据库或 UI；必须先校验 schema 和 anchor。
6. 不用分数替代 finding、证据和人工复核。
7. 完成后按以下格式交接：

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

- 新建第二套整书 job、cache 或 evidence index。
- 在 Controller 写业务逻辑。
- 在 service 写 SQL/Drizzle。
- `any`、`console.log`、吞错、业务层 `process.env`。
- 未经证据回查展示 verified finding。
- `git add -A`。

## 12. 质量门

按任务影响范围运行：

```bash
pnpm --filter @ai-novel-diagnosis/ai-core check
pnpm --filter @ai-novel-diagnosis/ai-core test
pnpm --filter @ai-novel-diagnosis/ai-core build

pnpm --filter api check
pnpm --filter api test
pnpm --filter api build

pnpm --filter web check
pnpm --filter web test
pnpm --filter web build
```

里程碑合并前运行：

```bash
pnpm run one:doctor
pnpm run check
pnpm run test
pnpm run build
```

任何命令失败都必须修复根因后重跑，不能在交接中写“与本任务无关”后直接宣布完成。

## 13. 发布与回滚

- 旧请求默认 `reference-study`，避免改变现有研究用户结果。
- 旧 job 没有 `storyAudit` 时只显示升级提示。
- Web 只有在项目关联 own-draft job 时显示故事体检入口的有效状态。
- verifier 失败时退化为统计 + candidate，不阻断整书任务成功。
- 某一 finding 类别精确率未达门槛时可单独隐藏，不回滚整个故事体检。
- 删除项目关联不删除原始 book job；删除 book job 前提示相关项目和 review 将失去证据来源。

## 14. 完成定义

- 快速诊断仍保持当前单章主流程。
- 我的作品和参考作品走同一基础设施、不同结果路径。
- 对话统计无需模型且可复算。
- 时间、人设、剧情 finding 有双侧可点击证据。
- 模型结论与作者复核分离持久化。
- partial、旧 job、模型失败、证据失败均有显式降级。
- 项目、复诊、方法论和导出形成完整闭环。
- Golden 精确率达到默认展示门槛。
- 所有适用质量门通过，changeset 与文档同步完成。
