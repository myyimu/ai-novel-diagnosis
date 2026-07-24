# 快速诊断 V3 问题解决与执行规格

状态：2026-07-13 的实施与验收记录；P0/P1 主链路已落地并通过验证，P2 已落地，P3 兼容层清理待实施。当前代码状态以实际实现和测试为准。
日期：2026-07-13  
适用范围：`apps/web`、`services/api`、`packages/ai-core`  
目标读者：负责继续实现本项目的开发者或代码模型

> 产品约束：本文服从 [`product-doctrine.md`](./product-doctrine.md)。快速诊断只负责编辑初筛与改稿交接，不证明读者流失因果，也不等于真实版本复诊。字段名 `confidence` 暂为兼容保留，用户语义统一为“证据/上下文充分度”，不得解释成结论正确概率。

## 0. 当前验收状态

截至 2026-07-13，本规格的实现状态如下：

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| P0：数据语义和缓存 | 已落地并通过验证 | `diagnosticFocus`、`chapterPosition`、默认重点同步、版本化缓存、方法论开关入缓存、mock 方法论默认关闭已完成。 |
| P1：提示词 V3 和确定性结果 | 主链路已落地并通过验证 | Prompt 路由、精简模型 Schema、选择性写作标准、后端确定性 Gate/分数/置信度、证据校验、采样披露、快速诊断移除平台推荐已完成。 |
| P2：可选 Token 消耗拆分 | 已落地 | 独立方法论卡接口、结果页主动触发、平台适配独立入口已完成；后续需补测试覆盖。 |
| P3：兼容层清理 | 待实施 | 旧字段、历史缓存、Dashboard 分数中心展示仍处于兼容阶段。 |

已通过验证命令：

```text
pnpm --dir packages/ai-core typecheck
pnpm --dir packages/ai-core test
pnpm --dir packages/ai-core lint
pnpm --dir packages/ai-core build
pnpm --dir services/api typecheck
pnpm --dir services/api test
pnpm --dir services/api lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

当时未执行：显式暂存、提交和推送。原因是当时工作区存在多项既有未提交改动，不能把该次变更与其他改动混合暂存。

## 1. 文档用途

本文是快速诊断子链路的可执行规格，不是完整产品闭环。完整闭环以“作者确认 -> 修改计划 -> 保存 V2 -> 独立复诊 -> 经确认的方法沉淀”为完成条件。

执行者应按本文的优先级、数据契约、提示词规则、文件清单和验收用例实施。产品目标和科学边界以 [`product-doctrine.md`](./product-doctrine.md) 为准；本文只定义快速诊断子链路。

实施前必须阅读根目录 `AGENTS.md`，并遵守各子项目的架构边界、测试、质量门禁和提交规范。

## 2. 目标结果

快速诊断应成为一次轻量、可追溯、可反驳的编辑初筛，而不是把平台分析、完整评分、Prompt
诊断、方法论生成和资产沉淀全部塞进同一次模型调用。

默认流程：

```text
输入正文与必要上下文
-> 本地校验和文本采样
-> 根据输入类型选择诊断 Prompt
-> 模型返回精简的证据型诊断
-> 后端确定性计算 Gate、证据充分度和兼容分数
-> 保存诊断会话
-> 打开章节工作区，由作者确认/拒绝问题并保存修改计划
-> 用户按需触发平台分析、完整评分或方法论沉淀
```

必须满足以下产品原则：

1. 默认只调用一次模型。
2. 默认不生成方法论卡，不消耗对应输出 Token。
3. 诊断重点、核心卖点和必须保留机制是三个不同概念。
4. 结论必须有输入内容中的短证据。
5. 快速诊断不预测平台算法、流量或商业成功。
6. 大纲、创意、正文和 AI 初稿不能共用同一套第一章提示词。
7. 缓存必须反映所有会改变结果的语义输入和 Prompt 版本。
8. 超长正文被采样时，结果页必须明确告诉用户诊断范围不完整。
9. 每个问题的读者影响只能是风险假设，并提供替代解释或“需人工判断”。
10. 缓存命中的同一正文不得创建新的改稿版本或复诊成功记录。
11. 方法卡只可进入待确认区，不能由一次诊断自动成为长期规则。

## 3. 当前已确认的问题

### P0-1：诊断重点被错误写入核心卖点（已落地）

当前页面的“本次最关心的问题”会调用：

```ts
setQuickReviewCoreSellingPoint(focus)
```

后端却把该值写入提示词中的“用户声明的核心卖点”。例如用户选择“为什么没人追读”，模型会收到：

```text
用户声明的核心卖点：为什么没人追读
```

影响：

- 模型会错误理解用户要保护的卖点。
- 卖点保护层、问题判断和改稿 Prompt 都可能偏离。
- 页面默认展示的诊断重点只有在用户主动点击后才同步，显示值和请求值可能不一致。

解决方案：新增独立的 `diagnosticFocus`，禁止再用 `coreSellingPoint` 承载诊断重点。

### P0-2：缓存键不完整（已落地）

当前快速诊断缓存键缺少：

- `diagnosticFocus`
- `chapterPosition`
- `includeMethodologyCards`
- `promptVersion`
- 文本采样策略版本

影响：

- 关闭方法论卡后产生的缓存，可能被开启方法论卡的请求复用。
- 修改提示词后，用户仍可能获得旧提示词的缓存结果。
- 同一正文按第一章和中间章节诊断时可能串结果。

解决方案：使用版本化、语义完整的缓存键，见第 8 节。

### P1-1：所有输入都被当作第一章正文（已落地）

底层系统提示词固定为“网文第一章诊断编辑”，但接口和页面允许：

- 人工写作稿
- AI 生成初稿
- 故事大纲
- 创意/脑洞
- Prompt
- 任何章节位置的正文

影响：

- 中间章节会被错误要求重新建立第一章承诺。
- 大纲和创意会被错误要求提供正文场景证据。
- Prompt 草稿会被正文指标评价。

解决方案：增加 `chapterPosition`，根据 `inputKind + chapterPosition` 路由 Prompt。

### P1-2：单次输出职责过载（已落地）

当前一次调用同时要求市场定位、卖点、核心问题、建议、平台推荐、完整评分准备度、快速分数、
Gate、问题证据、优点、改稿计划、上一条 Prompt 诊断、下一轮 Prompt 和方法论卡。

影响：

- 多个字段重复表达同一个问题。
- 输出预算被 JSON 字段名和重复内容消耗。
- 证据、改法和下一轮 Prompt 容易变得泛化。
- 小模型更容易截断或返回需要修复的 JSON。

解决方案：模型只生成证据型诊断和改稿信息；Gate、置信度、兼容分数由后端确定性计算。

### P1-3：注入了与当前任务无关的全部写作规则（已落地）

快速诊断会注入完整 `formatStoryCraftPromptBrief()`，其中包括短篇密度、长篇拆解资产、伏笔台账、
拆书迁移等并非每次章节急诊都需要的规则。

影响：

- 增加输入 Token。
- 稀释当前诊断重点。
- 模型可能为了覆盖规则而输出泛泛的全维度检查。

解决方案：按诊断模式选择 4 至 7 条相关标准，不再全量注入。

### P1-4：平台推荐和快速分数缺少充分依据（已落地）

当前请求没有完整提供目标平台、目标读者、阅读模式、作品篇幅和商业模式，却要求模型推荐平台。
`quickScore` 也没有稳定的数值锚点。

影响：

- 平台推荐容易成为基于题材的泛化猜测。
- 同一正文跨模型、跨请求的分数不稳定。
- 用户可能把文本侧判断误解为平台流量预测。

解决方案：快速诊断移除平台推荐；平台适配改为独立操作。兼容分数由后端按问题严重度计算。

### P2-1：文本采样范围未向用户披露（已落地）

超过长度限制的正文只保留头尾部分，但结果没有稳定声明“中段未检查”。

解决方案：后端返回 `analysisScope`，结果页展示采样范围和限制。

### P2-2：方法论卡仍与首次诊断耦合（已落地）

当前已默认关闭方法论卡，这是正确的过渡状态；但目标状态应把方法论沉淀放到结果页，用户阅读诊断后再决定是否生成。

解决方案：新增按需方法论生成接口，只传结构化问题、改稿计划和下一轮 Prompt，不重复发送整章正文。

## 4. 目标产品流程

### 4.1 默认快速诊断

```text
用户填写正文
-> 选择内容类型
-> 可选：章节位置、题材、诊断重点
-> 可选：核心卖点、必须保留机制、目标读者期待
-> AI 初稿时可选填写上一条 Prompt
-> 点击开始诊断
-> 一次模型调用
-> 保存诊断会话
-> 打开章节工作区
```

默认首次调用必须生成：

- 一句话诊断
- 1 至 3 个关键问题
- 每个问题的短证据、读者影响和具体改法
- 1 至 3 个应保留优点
- 改稿边界和复诊检查点
- 可直接复制的下一轮改稿 Prompt

默认首次调用不得生成：

- 方法论卡
- 平台推荐
- 完整评分报告
- 长篇资产
- 平台流量预测

### 4.2 结果页按需操作

结果页提供独立操作：

| 操作 | 是否调用模型 | 输入 | 说明 |
| --- | --- | --- | --- |
| 复制改稿 Prompt | 否 | 已有诊断结果 | 默认结果已经包含 |
| 重新诊断 | 是 | 当前正文和上下文 | 强制绕过缓存 |
| 完整评分 | 是 | 正文和评分 Rubric | 进入现有完整评分流程 |
| 分析平台适配 | 是 | 目标平台、读者、阅读模式 | 独立于快速诊断 |
| 沉淀方法论卡 | 可选调用 | 结构化 issue、revisionPlan、nextPrompt | 不重复提交整章正文 |

## 5. 输入契约

### 5.1 QuickReviewRequestV3

在现有 `QuickReviewDto` 上增加字段，保持旧客户端兼容：

```ts
type QuickReviewInputKind =
  | "human-draft"
  | "ai-draft"
  | "idea"
  | "outline"
  | "prompt";

type ChapterPosition =
  | "first"
  | "early"
  | "middle"
  | "final"
  | "unknown";

interface QuickReviewRequestV3 {
  inputKind?: QuickReviewInputKind;
  chapterPosition?: ChapterPosition;
  title?: string;
  genre?: string;
  chapterText: string;
  diagnosticFocus?: string;
  previousPrompt?: string;
  coreSellingPoint?: string;
  mustKeepMechanisms?: string;
  targetReaderPleasures?: string;
  includeMethodologyCards?: boolean;
  provider?: ProviderConfig;
}
```

字段语义必须严格区分：

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| `diagnosticFocus` | 用户本次最想检查什么 | `重点检查男女主关系推进是否自然` |
| `coreSellingPoint` | 用户认为作品最值得保护的吸引力 | `隐世强者拒绝权力形成反差爽感` |
| `mustKeepMechanisms` | 未判断有效性前禁止直接删除的装置 | `倒计时、论坛体、拒绝权势` |
| `targetReaderPleasures` | 目标读者等待的爽点、笑点或情绪回报 | `读者想看权力系统被主角的拒绝带偏` |

约束：

- `diagnosticFocus` 使用 `@IsOptional()`、`@IsString()`、`@MaxLength(200)`。
- `chapterPosition` 使用 `@IsOptional()`、`@IsString()`、`@IsIn(...)`。
- 旧请求没有 `chapterPosition` 时默认 `unknown`，不得默认认定为第一章。
- `[已完成]` `includeMethodologyCards` 在 P0 阶段保留；独立方法论接口完成后已标记废弃，但暂不删除。

### 5.2 页面默认值

- `diagnosticFocus` 默认值为“为什么没人追读”。
- 默认值必须存在于 Zustand 状态中，不能只存在于组件本地视觉状态。
- 页面显示值、缓存键和请求体必须来自同一份状态。
- 选择诊断重点不得修改 `coreSellingPoint`。
- `chapterPosition` 默认 `unknown`，高级选项中允许用户选择。

## 6. 输出契约

### 6.1 模型原始输出

模型只负责需要编辑判断的内容：

```ts
interface QuickReviewModelOutputV3 {
  inferredTitle: string;
  inferredGenre: string;
  readerPromise: {
    summary: string;
    evidence?: string;
  };
  mainProblem: string;
  issues: Array<{
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
    }>;
    readerImpact: string;
    fixAction: string;
    promptConstraint: string;
    blocksNextStep: boolean;
  }>;
  strengths: Array<{
    title: string;
    evidence?: string;
    keepAction: string;
  }>;
  revisionPlan: {
    keep: string[];
    change: string[];
    avoid: string[];
    checkpoints: string[];
  };
  promptDiagnosis?: {
    missingConstraints: string[];
    vagueInstructions: string[];
    improvedPromptPrinciples: string[];
  };
  nextPrompt: {
    title: string;
    prompt: string;
    linkedIssueIds: string[];
  };
}
```

不得要求模型输出：

- `gateDecision`
- `quickScore`
- `confidence`
- `recommendedPlatforms`
- `readyForFullReview`
- `methodologyCards`

这些字段由后端补齐、移除或通过独立流程生成。

### 6.2 API 最终输出

后端标准化后返回：

```ts
interface QuickReviewResultV3 extends QuickReviewModelOutputV3 {
  schemaVersion: "quick-review.v3";
  inputKind: QuickReviewInputKind;
  chapterPosition: ChapterPosition;
  gateDecision: "continue" | "revise" | "rebuild" | "insufficient";
  gateReason: string;
  quickScore: number | null;
  confidence: number;
  analysisScope: {
    originalCharacters: number;
    sampledCharacters: number;
    isPartial: boolean;
    samplingStrategy: "full" | "head-tail.v1";
    assumptions: string[];
  };
}
```

迁移期间可继续返回旧字段，但必须遵守：

- `recommendedPlatforms` 返回空数组。
- `methodologyCards` 默认返回空数组。
- `oneLineDiagnosis` 映射自 `mainProblem`。
- `actionableFixes` 映射自前 3 个 `issue.fixAction`。
- `positioning` 映射自 `readerPromise.summary`，仅用于兼容旧 UI。
- `readyForFullReview` 由后端根据输入类型、长度和证据完整性计算。

## 7. 后端确定性规则

### 7.1 Gate 计算

快速诊断不再接受模型直接决定 Gate。后端按以下顺序计算：

1. 输入不满足当前模式的最低有效信息，或所有 issue 都没有有效证据：`insufficient`。
2. 存在 `critical` 且 `blocksNextStep = true`：`rebuild`。
3. 存在 `high`，或至少两个 `medium`：`revise`。
4. 其他情况：`continue`。

快速诊断 V3 不自动返回 `discard`。是否放弃一个项目属于更高成本的创意/商业决策，不能只凭一次章节急诊下结论。

### 7.2 兼容分数计算

`quickScore` 只用于旧 UI 和趋势兼容，不作为主要产品判断。

```text
初始分 = 10
critical 每条扣 3.0
high 每条扣 2.0
medium 每条扣 1.0
low 每条扣 0.5
最终限制在 0 到 10，保留 1 位小数
```

当 Gate 为 `insufficient` 时，`quickScore = null`，页面显示“信息不足，暂不评分”。

### 7.3 证据/上下文充分度计算（兼容字段 `confidence`）

该值由后端根据可检查事实计算，不直接信任模型自报。它表示当前输入和证据是否足够支持进一步人工判断，不表示问题为真的概率：

```text
基础值 0.45
+ 正文达到当前模式建议长度：0.15
+ 每个关键 issue 都有可在采样文本中查到的证据：0.20
+ 用户提供题材或可稳定推断题材：0.05
+ 用户提供章节位置：0.05
+ 用户提供核心卖点或目标读者期待：0.05
- 使用头尾采样：0.10
- 发现不存在于采样文本的引用：每条 0.15
最终限制在 0 到 1
```

实现时把权重定义为命名常量，并为边界值编写单元测试。

界面在兼容期显示“证据充分度”，不得显示“AI 准确率 85%”或“85% 确定”。后续有独立编辑标注集后，正确概率应另建经过 Brier/ECE 校准的字段，不能复用该启发式值。

### 7.4 证据校验

- `evidence.quote` 必须能在实际提交给模型的采样文本中找到。
- 找不到的引用不得原样展示为“原文证据”。
- 找不到时删除该证据、降低置信度，并在 issue 中保留可执行建议。
- 若所有关键 issue 均无证据，将 Gate 降级为 `insufficient`。
- 大纲、创意和 Prompt 模式的 `quote` 表示“输入片段”，页面文案不得称为“正文原句”。

## 8. 缓存规则

在 `packages/ai-core` 或 API 中定义稳定版本：

```ts
export const QUICK_REVIEW_PROMPT_VERSION = "quick-review.v3";
export const QUICK_REVIEW_SAMPLING_VERSION = "head-tail.v1";
```

缓存键必须包含：

```text
provider fingerprint
prompt version
sampling version
input kind
chapter position
genre
diagnostic focus hash
previous prompt hash
core selling point hash
must keep mechanisms hash
target reader pleasures hash
include methodology cards（迁移阶段）
chapter title
chapter text hash
```

验收规则：

- 所有语义输入相同，重复点击可命中缓存。
- 任一语义输入变化，必须产生不同缓存键。
- “重新诊断”必须绕过缓存并覆盖相同键的旧结果。
- Prompt 或采样策略升级后不得命中旧缓存。

## 9. Prompt 路由

### 9.1 路由表

| 输入条件 | Prompt 模式 | 核心检查 |
| --- | --- | --- |
| `human-draft/ai-draft + first` | `first-chapter` | 阅读承诺、即时压力、前 300-800 字钩子、情绪回报、章尾追读 |
| `human-draft/ai-draft + early` | `early-chapter` | 承诺延续、角色行动、冲突升级、设定负担、连续追读 |
| `human-draft/ai-draft + middle/final` | `chapter-progress` | 本章目标、局势变化、情绪兑现、角色动机、章尾推进 |
| `human-draft/ai-draft + unknown` | `generic-draft` | 不强加第一章标准，明确章节位置未知假设 |
| `outline` | `outline-review` | 故事核、阶段目标、阻碍升级、关键兑现、结构断点 |
| `idea` | `idea-review` | 核心卖点、角色欲望、冲突发动机、差异化、可持续性 |
| `prompt` | `prompt-review` | 目标、读者、保留项、场景节点、禁区、输出和复检条件 |

`ai-draft` 且提供 `previousPrompt` 时，在对应正文模式上追加 Prompt 执行诊断；未提供时不要编造 Prompt 缺陷。

### 9.2 选择性写作标准

不要再向每次请求注入完整 `formatStoryCraftPromptBrief()`。

建议在 `packages/ai-core/src/story-craft.ts` 增加：

```ts
selectStoryCraftCriteria(mode: QuickReviewPromptMode): StoryCraftCriterion[]
```

每种模式只选择 4 至 7 条相关标准。快速诊断通用保留：

- 核心阅读承诺
- 目标、阻碍、行动和反馈
- 情绪引擎
- 钩子与回收
- 角色动机
- 先判断机制是否成立，再判断呈现问题
- 保护用户声明的有效卖点和必须保留机制

以下标准不得无条件注入：

- 长篇拆解资产
- 短篇密度
- 拆书迁移规则
- 全书伏笔台账

## 10. 快速诊断 Prompt 模板

实现时由代码按模式拼装，不要把用户正文插入 system message。

### 10.1 System message

```text
你是中文网文诊断编辑。你的任务是找出当前输入最可能造成读者失去期待的关键问题，
并给出有原文或输入片段证据的修改动作。

只评价提供的内容，不预测平台算法、流量、签约、收入或商业成功。
优先指出 1-3 个决定性问题，不做全维度凑数。
遇到系统面板、倒计时、论坛体、重复句式、热梗、日常弱冲突或主角拒绝行动等机制，
先判断它是否服务核心卖点和目标读者期待；机制成立时保护机制，只修呈现。
不得删除用户声明必须保留的机制。
证据必须来自本次提供的输入；无法确认时明确写成假设。
只返回符合 JSON Schema 的合法 JSON，不使用 Markdown，不解释推理过程。
```

### 10.2 User message 结构

```text
任务模式：{{promptMode}}
内容类型：{{inputKind}}
章节位置：{{chapterPosition}}
章节标题：{{title || "未提供"}}
题材：{{genre || "未指定，可从输入推断"}}
本次诊断重点：{{diagnosticFocus || "综合判断读者流失风险"}}
核心卖点：{{coreSellingPoint || "未提供"}}
必须保留机制：{{mustKeepMechanisms || "未提供"}}
目标读者期待：{{targetReaderPleasures || "未提供"}}
上一条 Prompt：{{previousPrompt || "未提供"}}

本模式检查标准：
{{selectedCriteria}}

执行顺序：
1. 先概括当前输入承诺给读者什么体验。
2. 判断用户声明的卖点和机制是否有效，列出应保留内容。
3. 只选择 1-3 个最影响阅读期待的问题。
4. 每个问题提供短证据、读者影响、具体修改动作和复诊约束。
5. 如果提供了上一条 Prompt，区分 Prompt 缺陷与正文执行缺陷。
6. 生成一条用于修改当前版本的 Prompt，不得另起炉灶，不得误删保留项。

输入内容：
{{sampledText}}
```

### 10.3 输出约束

- `issues` 只能返回 1 至 3 条。
- 每条证据引用建议不超过 80 个汉字。
- `mainProblem` 不超过 60 个汉字。
- `fixAction` 必须描述可在下一版执行的文本动作，不写“加强节奏”等空话。
- `nextPrompt.prompt` 必须包含修改目标、保留项、必须修改项、禁止项、输出要求和复诊检查点。
- `promptDiagnosis` 只在确实提供上一条 Prompt 时输出有效内容。
- 不输出平台推荐、方法论卡、模型自评分或模型自报置信度。

## 11. 方法论卡独立流程

目标接口：

```text
POST /analysis/methodology-cards
```

请求只包含：

```ts
interface GenerateMethodologyCardsRequest {
  projectId: string;
  revisionSessionId: string;
  issues: DiagnosisIssue[];
  revisionPlan: QuickReviewResultV3["revisionPlan"];
  nextPrompt: QuickReviewResultV3["nextPrompt"];
}
```

规则：

- 必须由用户在结果页主动点击。
- 不重复发送整章正文。
- 最多生成 1 至 3 张卡。
- 输出预算建议 500 至 700 Token。
- 生成成功后才写入项目方法论库。
- 生成失败不得影响已保存的诊断会话。
- 完成该接口和 UI 后，快速诊断中的 `includeMethodologyCards` 标记废弃。

若暂不实施独立接口，P0 过渡方案必须保证：

- 默认值为 `false`。
- 该值进入缓存键。
- `false` 时后端 Schema 和 normalize 最终都返回空数组。
- mock 和真实模型路径行为一致。

## 12. 平台适配独立流程

快速诊断中移除 `recommendedPlatforms` 的模型生成要求。

平台适配必须至少收集：

- 候选平台或“帮我选择”
- 目标读者
- 阅读模式
- 作品篇幅/连载预期
- 题材和核心卖点

输出必须标记为编辑假设，不得宣称平台内部算法结论。平台信息会随时间变化，产品接入真实平台规则时应使用可更新的数据源并记录版本。

## 13. 文件级实施清单

### 13.1 `packages/ai-core`

修改：

- `[已完成] src/types.ts`
  - 增加 `ChapterPosition`、`QuickReviewPromptMode`、V3 输入输出类型。
- `[已完成] src/prompts.ts`
  - 实现 Prompt 路由和模式化构建函数。
  - 导出稳定的 Prompt 版本常量。
- `[已完成] src/story-craft.ts`
  - 增加按模式选择诊断标准的纯函数。
- `[已完成] src/index.ts`
  - 只导出确实需要跨包使用的稳定符号。
- `[已完成] 对应 *.test.ts`
  - 测试所有 Prompt 模式、条件字段和禁止输出要求。

若新增或修改公共 API，按 `AGENTS.md` 执行 changeset。`[已完成]`

### 13.2 `services/api`

修改：

- `[已完成] src/modules/analysis/dto/quick-review.dto.ts`
  - 增加 `diagnosticFocus` 和 `chapterPosition` 及校验。
- `[已完成] src/modules/analysis/analysis-json-schemas.ts`
  - 增加精简模型输出 Schema。
- `[已完成] src/modules/analysis/analysis.service.ts`
  - 路由 Prompt 模式。
  - 返回采样范围。
  - 校验证据引用。
  - 确定性计算 Gate、分数和置信度。
  - 保留旧字段兼容映射。
  - 移除快速诊断平台推荐生成。
- `[已完成] src/modules/analysis/analysis.service.spec.ts`
  - 增加第 14 节要求的单元测试。
- `[已完成] 后续新增方法论 DTO、controller 路由和 service 方法。`

架构约束：controller 只负责路由和参数解析；业务规则放 service；若需要持久化，只能通过 repository。

### 13.3 `apps/web`

修改：

- `[已完成] src/stores/workspace-store.ts`
  - 增加持久化的 `quickReviewDiagnosticFocus` 和 `quickReviewChapterPosition`。
  - 默认诊断重点写入 store，而不是组件本地状态。
- `[已完成] src/components/workspace/quick/QuickDiagnosisCompose.tsx`
  - 诊断重点绑定独立字段。
  - 核心卖点继续保留独立输入。
  - 增加折叠式章节位置选择。
  - 结果加载文案只展示真实阶段。
- `[已完成] src/lib/workspace-analysis-client.ts`
  - 发送新字段。
- `[已完成] src/lib/workspace-cache.ts`
  - 实现第 8 节缓存键。
- `[已完成] src/hooks/use-workspace-handlers.ts`
  - 传递新字段。
  - 统一缓存、请求、保存和跳转逻辑。
  - 过渡阶段保证方法论选项进入缓存键。
- `[部分完成] 章节工作区结果组件`
  - 展示 `analysisScope`。
  - Gate 为 `insufficient` 时隐藏分数并提示补充信息。
  - `[已完成] 平台推荐和方法论沉淀已变成独立按钮。`
- `[部分完成] 对应 *.test.tsx` 和 store/cache 测试。

## 14. 必须覆盖的测试

### P0 数据正确性

1. `[已覆盖]` 页面首次加载时，不点击诊断重点，发出的请求仍包含默认重点。
2. `[已覆盖]` 选择“开头是否抓人”不会修改 `coreSellingPoint`。
3. `[已覆盖]` 自定义诊断重点优先于预设值。
4. `[已覆盖]` 相同正文在方法论开关不同的情况下缓存键不同。
5. `[已覆盖]` Prompt 版本变化后缓存键不同。
6. `[已覆盖]` 章节位置变化后缓存键不同。
7. `[已覆盖]` mock 路径在方法论关闭时不会返回或保存方法论卡。

### P1 Prompt 和结果

1. `[已覆盖]` `first` 使用第一章标准。
2. `[已覆盖]` `middle` 不出现“前 300-800 字必须建立第一章承诺”。
3. `[已覆盖]` `outline` 不把输入片段称为正文原句。
4. `[已覆盖]` `idea` 不要求完整场景证据。
5. `[已覆盖]` `ai-draft + previousPrompt` 返回 Prompt 诊断。
6. `[已覆盖]` 未提供上一条 Prompt 时，Prompt 诊断为空且不得编造。
7. `[已覆盖]` 模型输出平台推荐时，normalize 不把它写入最终快速诊断结果。
8. `[已覆盖]` Gate 与严重度规则一致，不接受模型越权值。
9. `[已覆盖]` 引用不在采样文本中时被移除并降低置信度。
10. `[已覆盖]` 所有证据被移除时返回 `insufficient`。
11. `[已覆盖]` 超长正文返回 `analysisScope.isPartial = true`。
12. `[已覆盖]` 模型 JSON 不完整时仍能生成可展示的降级结果。

### P2 可选能力

1. `[已落地，待覆盖]` 用户未点击“沉淀方法论卡”时不调用方法论接口。
2. `[已落地，待覆盖]` 方法论请求不包含整章正文。
3. `[已落地，待覆盖]` 方法论生成失败不影响诊断会话。
4. `[已落地，待覆盖]` 平台分析未提供必要上下文时返回校验错误，而不是猜测。

## 15. 实施顺序

### P0：先修数据语义和缓存（已完成）

范围：

- 拆分 `diagnosticFocus` 和 `coreSellingPoint`。
- 修复页面默认诊断重点同步。
- 增加 `chapterPosition`。
- 缓存加入诊断重点、章节位置、方法论开关、Prompt 版本和采样版本。
- 修复 mock 与真实模型的方法论行为一致性。

P0 必须作为一个独立逻辑变更完成，不与大规模 UI 重构混合。

### P1：提示词 V3 和确定性结果（主链路已完成）

范围：

- 增加 Prompt 路由。
- 精简模型输出 Schema。
- 选择性注入写作标准。
- 后端计算 Gate、置信度和兼容分数。
- 增加证据校验和采样披露。
- 快速诊断停止生成平台推荐。
- 保持旧 UI 所需字段兼容。

### P2：拆分可选 Token 消耗（已落地）

范围：

- `[已完成]` 结果页按需生成方法论卡。
- `[已完成]` 平台适配独立入口。
- 完整评分继续使用独立流程。
- `[已完成]` 废弃快速诊断中的 `includeMethodologyCards`。

### P3：清理兼容层（待实施）

满足以下条件后再执行：

- 所有前端结果页已经读取 V3 字段。
- 历史缓存和持久化记录完成迁移或可以安全失效。
- Dashboard 不再依赖模型自报分数。

届时才可删除旧字段和旧 Prompt。不要在 P0 或 P1 提前做破坏性删除。

## 16. 验收标准

产品验收：

- 用户选择的诊断重点与模型收到的字段一致。
- 核心卖点不会被诊断重点覆盖。
- 简单改稿用户只发生一次必要模型调用。
- 默认不生成方法论卡或平台建议。
- 结果优先展示 1 至 3 个证据明确的问题。
- 每个问题都有可能的读者影响、替代解释、具体改法和复诊检查点。
- 中间章节、大纲和创意不会被第一章标准误判。
- 文本被截断时用户能看到明确提示。
- Prompt 更新后不会复用旧缓存。

工程验收：

- 新外部输入全部经过 DTO 和 `class-validator` 校验。
- Controller 无业务逻辑。
- 没有新增 `any`、`console.log`、吞错或业务层 `process.env`。
- `packages/ai-core` 的公共 API 有类型、JSDoc、测试和 changeset。
- Web、API、ai-core 的相关 typecheck、lint、test、build 按各自 `AGENTS.md` 全部通过。
- 只显式暂存本次修改文件，不使用 `git add -A`。
- 每个提交只包含一个逻辑阶段，并使用 Conventional Commit。

## 17. 执行者禁止事项

- 不得继续用 `coreSellingPoint` 保存诊断重点。
- 不得让组件显示一个默认重点、请求却发送空值。
- 不得在缓存键中遗漏 Prompt 版本。
- 不得让模型在快速诊断中预测平台流量或商业成功。
- 不得无条件注入全部写作诊断标准。
- 不得让模型自行决定最终 Gate、分数和置信度。
- 不得把兼容分数或证据充分度宣传为作品质量或结论正确率。
- 不得让缓存命中创建伪版本、伪复诊或 Prompt 有效记录。
- 不得自动把一次诊断生成的方法卡写入长期方法库。
- 不得默认自动生成或保存方法论卡。
- 不得因为方法论生成失败而回滚已完成的诊断。
- 不得一次性删除旧字段，必须按 P0-P3 迁移。
- 不得把 `AGENTS.md` 或 `CLAUDE.md` 当作普通文件手工修改。

## 18. 完成定义

只有在以下条件全部满足后，快速诊断 V3 这个“编辑初筛子链路”才算完成：

```text
语义字段正确
+ Prompt 按输入类型路由
+ 输出聚焦 1-3 个关键问题
+ 证据可校验
+ Gate/证据充分度/兼容分数可复现且用户语义不误导
+ 缓存完整且版本化
+ 超长采样可见
+ 方法论和平台分析按需触发
+ 新旧数据安全迁移
+ 全部质量门禁通过
```

最终用户体验应当是：用户只需粘贴内容并点击一次，就能知道当前版本最值得先解决的问题、证据在哪里、哪些内容必须保留，以及下一版具体怎么改；其余高成本能力由用户主动选择。

快速诊断完成后必须把用户交给项目工作区的真实改稿链路。只有作者确认问题、保存 V1/V2、记录实际采用项并完成独立 issue 复诊，产品层面的“修改有效”才可成立。
