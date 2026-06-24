# AI 网文诊断台工作流化改造计划

日期：2026-06-24

## 目标

把当前“单次诊断 + 改稿 Prompt”的 MVP，升级成可持续复诊的诊断工作流。

核心目标不是增加更多生成能力，而是把诊断能力做深：

```text
稿件输入
-> 结构化审查
-> Gate 判断
-> 证据链与读者影响
-> 下一步改稿动作
-> Prompt 复诊
-> 方法论沉淀
-> 质量趋势看板
```

## 实施状态

截至 2026-06-24，已完成三轮产品化落地：

1. 结构化诊断已接入 Quick Review：返回 `gateDecision`、`issues`、证据、读者影响、下一步动作、`nextPrompt` 和 `methodologyCards`。
2. 前端结果区已从“总分 + 简短建议”升级为“总判断 + 关键问题证据链 + 改稿 Prompt + 方法论卡片”。
3. 已暴露稿件来源和上一条 Prompt 输入，用于区分作者正文、AI 生成稿、脑洞、大纲和 Prompt 草稿。
4. 本地 store 已开始沉淀 `revisionSessions` 和项目级 `methodologyCards`，每次重新诊断会生成可复诊的本地迭代档案。
5. 首页结果区已显示轻量项目迭代资产：复诊次数、方法论卡数量、最近分数变化和高频 Gate。
6. 已新增独立诊断 Dashboard，展示质量趋势、Gate 分布、常见问题、问题类型、Prompt 有效率推断和高频方法论卡。
7. 已新增独立方法论库，支持按类型筛选、关键词搜索、复用次数排序，并复制可复用 Prompt 模板。
8. 已新增项目隔离：复诊记录和方法论卡按当前项目沉淀，避免多本书互相污染。
9. 已新增项目级复诊历史页，可回看每一次复诊、相邻版本变化和当时生成的下一轮 Prompt。
10. 已支持复诊人工备注，可记录本版实际按哪些建议改了，为后续 Prompt 有效率归因提供依据。
11. 已支持项目 Markdown 导出包，把当前项目的复诊轨迹、人工备注、方法论卡和 Prompt 模板一次性沉淀为可带走文档。

仍未完成：

- 复诊、Dashboard、方法论库和项目导出仍以浏览器本地状态为主，需要后端持久化。
- Prompt 有效率目前基于相邻复诊分数推断，需要结合人工备注做更细归因。

## 借鉴点转化

### 1. 把诊断当成流水线，而不是一次模型调用

当前状态：

```text
粘贴章节 -> 调 quick-review -> 返回简短结果 -> 前端拼改稿 Prompt
```

目标状态：

```text
输入归类
-> 文本预检
-> 结构化 issue 审查
-> Gate 判断
-> 改稿 Prompt 生成
-> 复诊检查点生成
-> 方法论卡片沉淀
```

产品原则：

- 用户看到的是简单报告。
- 系统内部必须有稳定阶段和结构化结果。
- 每个阶段的输出都能用于复诊、趋势统计和方法论沉淀。

### 2. 审查结果用结构化 issue，不只靠总分

当前问题：

- `quickScore` 有用，但容易让用户只看分数。
- `mainProblem` 太单薄，不能支撑复诊和趋势统计。

目标结构：

```ts
interface DiagnosisIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category:
    | "opening"
    | "hook"
    | "character_goal"
    | "conflict_pressure"
    | "payoff"
    | "pacing"
    | "setting_load"
    | "prose_ai_flavor"
    | "prompt_constraint"
    | "market_promise"
    | "other";
  title: string;
  description: string;
  evidence: Array<{
    quote: string;
    locationHint: string;
    confidence: number;
  }>;
  readerImpact: string;
  fixAction: string;
  promptConstraint: string;
  blocksNextStep: boolean;
}
```

分数定位：

- `quickScore` 保留，但只用于概览、趋势和排序。
- 产品判断以 `issues`、`blocksNextStep` 和 `gateDecision` 为准。

### 3. 引入 Gate 判断

Gate 是让用户快速知道“下一步怎么处理”的判断，不是平台流量预测。

建议枚举：

```ts
type GateDecision =
  | "continue"
  | "revise"
  | "rebuild"
  | "discard";
```

含义：

| Gate | 用户理解 | 下一步 |
| --- | --- | --- |
| `continue` | 有明显可用基础 | 进入深度质检或继续下一章 |
| `revise` | 有潜力，但关键问题要先改 | 按 Prompt 改一版后复诊 |
| `rebuild` | 当前稿子的问题在脑洞、结构或开头承诺 | 先重构开头/卖点/大纲，不要继续润色 |
| `discard` | 不建议继续投入当前稿 | 废稿或换脑洞，保留可学习方法论 |

展示规则：

- 首屏结果顶部展示 Gate。
- Gate 必须由 issue 严重度和数量推导，不能由模型随意给。
- `discard` 要慎用，必须解释不是否定作者，而是当前稿件投入产出低。

### 4. 每个问题都要有证据、读者影响和下一步动作

Issue 必须满足一条完整链路：

```text
问题
-> 原文证据
-> 读者可能反应
-> 修改动作
-> Prompt 约束
-> 复诊检查点
```

例子：

```text
问题：主角目标太晚出现
证据：前 600 字主要在解释背景，主角没有明确要争取或避免的结果
读者影响：读者不知道为什么要继续看，容易在开头退出
修改动作：前 300 字补出主角目标、失败代价和阻碍者
Prompt 约束：改写时前 300 字必须出现目标、代价、阻碍，不新增无关设定
复诊检查点：新版前 300 字是否能回答“主角现在要什么，失败会怎样”
```

### 5. 沉淀项目经验/作者方法论，不只保存历史任务

当前问题：

- 历史任务只能证明“做过什么”。
- 方法论库要回答“作者下次怎么避免同类问题”。

新增结构：

```ts
interface MethodologyCard {
  id: string;
  sourceIssueId: string;
  type:
    | "opening_rule"
    | "prompt_rule"
    | "pacing_rule"
    | "hook_rule"
    | "payoff_rule"
    | "anti_pattern";
  title: string;
  triggerProblem: string;
  reusableRule: string;
  selfCheckQuestion: string;
  promptTemplate?: string;
  exampleBefore?: string;
  exampleAfter?: string;
  createdAt: string;
  usageCount: number;
}
```

方法论库第一版不做复杂账号系统，先用本地持久化：

- 浏览器 localStorage：适合快速 MVP。
- 后端 PGlite/PostgreSQL 表：适合复诊历史和本地长期使用。

推荐先落本地 store，再扩展后端持久化。

### 6. Dashboard 展示质量趋势，不只是任务列表

当前历史任务适合恢复，但不够像诊断产品。

新增 Dashboard 指标：

- 最近诊断次数。
- Gate 分布：continue / revise / rebuild / discard。
- 高频 issue 类别。
- Prompt 有效率：使用上一轮 Prompt 后，issue 是否减少或 Gate 是否改善。
- 复诊改善趋势：quickScore、critical/high issue 数变化。
- 方法论卡片增长。
- 作者最常见 3 个问题。

Dashboard 不是首屏入口，放在“我的方法论”或“历史任务”的进阶区域。

## 数据契约建议

### QuickReviewV2

```ts
interface QuickReviewV2 {
  id: string;
  title: string;
  genre: string;
  inputKind: "human-draft" | "ai-draft" | "idea" | "outline" | "prompt";
  quickScore: number;
  confidence: number;
  gateDecision: GateDecision;
  gateReason: string;
  oneLineDiagnosis: string;
  issues: DiagnosisIssue[];
  strengths: Array<{
    title: string;
    evidence?: string;
    keepAction: string;
  }>;
  revisionPlan: {
    priorityIssueIds: string[];
    keep: string[];
    change: string[];
    avoid: string[];
    checkpoints: string[];
  };
  promptDiagnosis?: {
    originalPrompt?: string;
    missingConstraints: string[];
    vagueInstructions: string[];
    improvedPromptPrinciples: string[];
  };
  nextPrompt: {
    title: string;
    prompt: string;
    linkedIssueIds: string[];
    whyThisWorks: string[];
  };
  methodologyCards: MethodologyCard[];
}
```

### RevisionSession

```ts
interface RevisionSession {
  id: string;
  title: string;
  inputKind: QuickReviewV2["inputKind"];
  versions: Array<{
    versionId: string;
    createdAt: string;
    textHash: string;
    diagnosis: QuickReviewV2;
    promptUsed?: string;
  }>;
  latestGate: GateDecision;
  latestScore: number;
}
```

### RevisionComparison

```ts
interface RevisionComparison {
  previousVersionId: string;
  currentVersionId: string;
  scoreDelta: number;
  gateChanged: {
    from: GateDecision;
    to: GateDecision;
  };
  resolvedIssueIds: string[];
  repeatedIssueIds: string[];
  newIssueIds: string[];
  promptEffectiveness: "effective" | "partial" | "ineffective" | "unknown";
  nextOneMove: string;
}
```

## 页面改造计划

### 首页：诊断输入

保留简单入口：

```text
把最想救的一章贴到这里
```

新增但默认轻量展示：

- 输入来源：人工稿 / AI 初稿 / 脑洞 / 大纲 / Prompt。
- 如果选择 AI 初稿，展开“上一条 Prompt”输入框。

首屏不展示复杂概念，不出现“流水线”“Gate”等技术词。

### 结果页：诊断报告

报告顺序：

1. 总判断：继续 / 修改 / 重构 / 废稿。
2. 一句话诊断。
3. 最严重 1-3 个问题。
4. 每个问题展示：证据、读者影响、下一步动作。
5. 下一轮 Prompt。
6. 复诊检查点。
7. 加入方法论库。

### 复诊区

用户改后再次提交时，显示：

- Gate 变化。
- 分数变化。
- 已解决问题。
- 仍重复问题。
- 新出现问题。
- 上一轮 Prompt 是否有效。
- 下一步只做一个动作。

### 我的方法论

新增页面或历史页中的 Tab：

- 高频问题。
- Prompt 规则。
- 开头规则。
- 爽点/钩子规则。
- 反面清单。
- 复诊有效经验。
- 趋势图。

## 后端实现计划

### P0：契约升级

范围：

- 扩展 `QuickReviewResult` 类型。
- 扩展 `quickReviewJsonSchema`。
- 更新 quick-review prompt，要求输出 issue 链路。
- 后端 normalize 时补齐默认字段，保证旧模型输出也能兼容。
- 前端先兼容新旧两种结果。

验收：

- mock 模式能返回 `gateDecision`、`issues`、`nextPrompt`、`methodologyCards`。
- 真实模型 JSON 不完整时，后端能降级生成可显示报告。

### P1：复诊版本

范围：

- 本地 store 增加 `revisionSessions`。
- 每次 quick review 根据文本 hash 关联 session。
- 用户选择“作为新版复诊”时生成 comparison。
- 前端展示 RevisionComparison。

验收：

- 同一稿件改两版后，能看到问题变化。
- 不再只显示分数变化。
- 能判断上一轮 Prompt 是 effective / partial / ineffective。

### P2：方法论库

范围：

- 本地 store 增加 `methodologyCards`。
- 诊断结果里的卡片可一键加入。
- 自动按类型聚合。
- 展示重复出现的问题和使用次数。

验收：

- 用户完成 3 次诊断后，能看到自己的高频问题。
- 每张卡片有自查问题和 Prompt 模板。
- 方法论库不只是历史记录。

### P3：诊断 Dashboard

范围：

- 基于 `revisionSessions` 和 `methodologyCards` 计算趋势。
- 展示 Gate 分布、issue 分布、Prompt 有效率、复诊改善。
- 历史任务继续保留，Dashboard 作为质量视角。

验收：

- 用户能看到最近诊断质量是否变好。
- 用户能知道最常犯的 3 类问题。
- Prompt 有效率有基础统计。

## 文件级改造建议

### `packages/ai-core`

- `src/types.ts`
  - 增加 `DiagnosisIssue`、`GateDecision`、`QuickReviewV2`、`MethodologyCard`、`RevisionComparison`。
- `src/prompts.ts`
  - 增加 Quick Review v2 prompt。
- `src/validation.ts`
  - 增加新输入类型校验。
- `src/metrics.ts`
  - 将 gate/issue 严重度转为趋势指标。

### `services/api`

- `analysis-json-schemas.ts`
  - 增加 quickReview v2 schema。
- `analysis.service.ts`
  - 更新 prompt 构建、normalize、mock 结果。
  - 增加 issue fallback 生成逻辑。
- `dto/quick-review.dto.ts`
  - 增加 `inputKind`、`previousPrompt`。

### `apps/web`

- `workspace-store.ts`
  - 增加 `revisionSessions`、`methodologyCards`。
- `quick-experience-panel.tsx`
  - 增加输入来源选择。
  - 结果区改为 issue 报告结构。
- 新增或扩展页面：
  - `methodology-view.tsx`
  - `diagnosis-dashboard.tsx`

## 测试计划

### 单元测试

- gate 推导逻辑。
- issue normalize。
- revision comparison。
- methodology card dedupe。

### Golden fixtures

建立样本：

- 开头目标不清。
- 设定过重。
- AI 腔明显。
- 爽点没有压迫。
- Prompt 太泛。
- 改后有效。
- 改后无效。

每个 fixture 标注：

- 预期 gate。
- 预期 top issue category。
- 预期 next action。

### E2E

流程：

```text
填示例章节
-> 生成诊断
-> 查看 Gate 和 issue
-> 复制 Prompt
-> 粘贴改后版本
-> 生成复诊对比
-> 加入方法论库
-> 查看 Dashboard
```

## 风险与边界

- Gate 不是商业成功预测，只是当前稿件投入优先级建议。
- `discard` 必须谨慎，文案要表达“当前版本不建议继续投入”，不是否定作者能力。
- Prompt 有效率只能基于复诊结果推断，不能宣称绝对因果。
- AI 生成稿诊断不能变成代写承诺。
- 方法论库不应收集敏感正文到外部服务；本地部署默认本地保存。

## 里程碑

### 第 1 周：结构化诊断

- 已完成：QuickReviewV2 类型和 mock。
- 已完成：Issue 报告 UI。
- 已完成：Gate 顶部展示。

### 第 2 周：复诊对比

- 已完成：本地 `RevisionSession` 沉淀。
- 已完成：相邻两次诊断的分数和问题变化展示。
- 已完成：Prompt 有效率初版，基于上一轮 Prompt 后的相邻复诊分数变化推断。

### 第 3 周：方法论库

- 已完成：项目级 `MethodologyCard` 去重、计数、首页摘要和 Dashboard 排行展示。
- 已完成：我的方法论页面。
- 已完成：高频问题聚合初版。

### 第 4 周：诊断 Dashboard

- 已完成：Gate 分布。
- 已完成：Issue 分布。
- 已完成：Prompt 有效率。
- 已完成：复诊改善趋势。

## 成功标准

这个计划完成后，产品应该从：

```text
AI 给我点评一章
```

升级为：

```text
AI 帮我诊断稿件、指导下一版、验证改稿是否有效，并沉淀我的写作方法论。
```

用户能清楚回答：

- 这篇稿子现在值不值得继续改。
- 最大问题具体在哪里。
- 读者为什么会走。
- 下一轮 Prompt 应该怎么写。
- 改后是否真的变好。
- 我反复犯的写作问题是什么。
