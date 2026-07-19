---
title: 故事体检模型与数据协议
status: ready-for-implementation
schema_version: story-audit.v1
last_updated: 2026-07-18
---

# 故事体检模型与数据协议

> 本协议服从 [`../product-doctrine.md`](../product-doctrine.md)。模型输出服务编辑方法蒸馏与作者决策，不能把 finding、`confidence` 或优先级解释成客观作品质量。

## 1. 协议目标

本协议用于指导编码模型实现整书故事体检，也用于约束运行时模型输出。核心要求是把“编辑标准”“原文事实”“冲突候选”“复核结论”“作者决定”“修改版本”分开保存，禁止模型用自然语言结论替代证据或人工取舍。

## 2. 处理流水线

```text
文本预处理
  -> 章节/场景切分
  -> Map：事实、事件、人物状态、对话统计原子数据
  -> Reduce：实体消歧、全局事件图、人物状态账本、剧情线
  -> Rule：时间/状态/统计的确定性候选发现
  -> Verify：独立模型只复核候选，不重新自由审稿
  -> Editorialize：关联编辑标准、排序、阅读风险假设、修改动作
  -> Human review：确认问题/创作意图/证据不足/误报
  -> Revision：保存修改计划、真实 V2 和实际采用项
  -> Retest：独立比较 finding 状态
```

禁止跳过 Map/Reduce，直接把整本书交给一个模型输出最终漏洞列表。

### 2.1 与现有整书流水线的关系

故事体检是现有 `/analysis/book/jobs` 的可选分析 profile，不是第二套上传、任务、持久化或证据检索系统：

```text
现有 TXT upload/preprocess
  -> 现有 BookAnalysisJob + chapterMaps
  -> 现有 characters/relationships/plotlines/chronicle/writingSupport
  -> 新增 storyAudit 派生结果
  -> 仍由现有 job status/search/export 对外提供
```

运行时结果嵌入现有返回值：

```ts
interface BookAnalysisResult {
  analysisPurpose?: "own-draft" | "reference-study";
  storyAudit?: StoryAuditResult;
}
```

现有字段是种子和兼容回退，不是第二份真相：

- `mapReduce.chapterMaps/sourceAnchors` 提供章节 Map 和证据。
- `characters/relationships` 提供实体消歧种子。
- `plotlines/chronicle` 提供剧情线与事件种子。
- `writingSupport.chapterFunctionTable/foreshadowingLedger` 提供结构与伏笔种子。
- `writingSupport.continuationPack` 和 `generationAssets` 只能生成待作者确认的 canon 候选。
- `storyAudit.scenes/events/facts` 是一致性推理使用的规范化派生层，不能反向悄悄覆盖旧资产。

## 3. 公共契约草案

实现时将以下类型放入 `packages/ai-core/src/story-audit.ts`，由 `src/index.ts` 显式导出。字段调整必须同步更新测试、API DTO 和本文档。

```ts
export type StoryAuditSchemaVersion = "story-audit.v1";

export type StoryAuditProfile =
  | "statistics"
  | "continuity"
  | "structure"
  | "character"
  | "full";

export interface StoryAuditRequest {
  projectId: string;
  bookJobId: string;
  purpose: "own-draft" | "reference-study";
  profiles: StoryAuditProfile[];
  scope?: {
    chapterIds?: string[];
    mainCharacterIds?: string[];
  };
  preferences?: {
    storyOrder?: "linear" | "nonlinear" | "mixed";
    dialogueQuoteStyles?: Array<"curly" | "corner" | "double-corner" | "ascii">;
    excludeDialogueKinds?: Array<"message" | "letter" | "system" | "inner-monologue">;
    structureTemplate?: "none" | "three-act" | "hero-journey" | "story-circle" | "custom";
  };
}

export interface StoryEvidenceAnchor {
  anchorId: string;
  chapterId: string;
  chapterOrder: number;
  sceneId?: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  source: "text" | "author-canon";
}

export interface StoryScene {
  id: string;
  chapterId: string;
  orderInChapter: number;
  narrativeOrder: number;
  title: string;
  povCharacterId?: string;
  locationIds: string[];
  participantIds: string[];
  goal?: string;
  conflict?: string;
  outcome?: string;
  entryHook?: string;
  exitHook?: string;
  evidence: StoryEvidenceAnchor[];
}

export type TemporalRelation =
  | "before"
  | "after"
  | "overlaps"
  | "during"
  | "same_time"
  | "unknown";

export interface StoryEvent {
  id: string;
  sceneId: string;
  summary: string;
  participantIds: string[];
  locationIds: string[];
  absoluteTime?: string;
  relativeTimeText?: string;
  durationMinutes?: number;
  relations: Array<{
    targetEventId: string;
    relation: TemporalRelation;
    confidence: number;
  }>;
  evidence: StoryEvidenceAnchor[];
}

export type StoryFactKind =
  | "identity"
  | "appearance"
  | "age"
  | "ability"
  | "knowledge"
  | "goal"
  | "belief"
  | "relationship"
  | "location"
  | "possession"
  | "injury"
  | "world_rule";

export interface StoryFact {
  id: string;
  subjectId: string;
  predicate: string;
  object: string;
  kind: StoryFactKind;
  validFromEventId?: string;
  validToEventId?: string;
  polarity: "asserted" | "negated" | "uncertain";
  sourcePriority: "author-canon" | "explicit-text" | "model-inference";
  confidence: number;
  evidence: StoryEvidenceAnchor[];
}

export interface CharacterStatePoint {
  characterId: string;
  sceneId: string;
  goalDistance: "closer" | "neutral" | "farther" | "unknown";
  agency: number;
  beliefState?: string;
  relationshipStates: Array<{
    targetCharacterId: string;
    trust?: number;
    intimacy?: number;
    power?: number;
  }>;
  cost?: string;
  irreversibleChoice?: string;
  evidence: StoryEvidenceAnchor[];
}

export type StoryAuditFindingCategory =
  | "timeline_conflict"
  | "location_conflict"
  | "fact_contradiction"
  | "knowledge_violation"
  | "ability_violation"
  | "motivation_gap"
  | "relationship_jump"
  | "world_rule_violation"
  | "causal_gap"
  | "dropped_goal"
  | "unresolved_setup"
  | "dialogue_attribution"
  | "structure_signal";

export interface StoryAuditFinding {
  id: string;
  category: StoryAuditFindingCategory;
  severity: "critical" | "high" | "medium" | "low";
  status: "candidate" | "verified" | "needs_human" | "dismissed";
  reviewState: "unreviewed" | "confirmed" | "author_intent" | "insufficient_evidence" | "false_positive" | "planned" | "resolved";
  title: string;
  claim: string;
  evidence: StoryEvidenceAnchor[];
  relatedFactIds: string[];
  relatedEventIds: string[];
  ruleIds: string[];
  alternativeExplanations: string[];
  readerImpact?: string;
  fixAction?: string;
  confidence: number;
}

export interface DialogueStatistics {
  scopeId: string;
  effectiveCharacterCount: number;
  dialogueCharacterCount: number;
  dialogueCharacterRatio: number;
  paragraphCount: number;
  dialogueParagraphCount: number;
  dialogueParagraphRatio: number;
  dialogueTurnCount: number;
  dialogueTagCount: number;
  unattributedTurnCandidateCount: number;
  parserWarnings: string[];
}

export interface StoryAuditResult {
  schemaVersion: StoryAuditSchemaVersion;
  auditId: string;
  projectId: string;
  bookJobId: string;
  generatedAt: string;
  coverage: {
    analyzedChapterIds: string[];
    totalChapterCount: number;
    isPartial: boolean;
    sceneExtractionRate: number;
    evidenceValidationRate: number;
  };
  scenes: StoryScene[];
  events: StoryEvent[];
  facts: StoryFact[];
  characterStates: CharacterStatePoint[];
  findings: StoryAuditFinding[];
  metrics: {
    dialogue: DialogueStatistics[];
  };
  views: {
    plotlineMatrix: Array<{
      plotlineId: string;
      sceneIds: string[];
      status: "active" | "quiet" | "resolved" | "unknown";
    }>;
    setupPayoffEdges: Array<{
      setupFactId: string;
      payoffFactId?: string;
      status: "open" | "reminded" | "paid" | "abandoned" | "unknown";
    }>;
  };
}
```

## 4. 证据与置信度规则

### 4.1 证据硬规则

- `quote` 必须能在对应章节标准化正文中精确找到。
- `startOffset/endOffset` 由服务端根据 quote 重新定位，不能信任模型提供的偏移量。
- 高优冲突至少需要两个不同位置的证据，或一个正文证据加一个作者确认 canon。
- 相同句子的重复引用不算双证据。
- 部分分析不得把未分析章节中的未知状态写成“没有发生”。
- 模型找不到证据时返回空候选，不得补写合理化文本。

### 4.2 置信度组成

最终置信度由服务端计算，模型只能提供子信号：

```text
confidence =
  0.35 * evidence_exactness
  + 0.25 * extraction_agreement
  + 0.20 * rule_strength
  + 0.20 * verifier_confidence
```

建议阈值：

- `>= 0.85`：允许成为 `verified`，仍需支持作者推翻。
- `0.60～0.84`：`needs_human`。
- `< 0.60`：默认折叠为低置信候选，不进入顶部警报。

## 5. 模型角色协议

### 5.1 Extractor：只抽取，不评价

System 约束：

```text
你是小说事实抽取器，只处理当前可见场景。抽取显式事件、人物状态、时间线索、地点、知识获得、目标和世界规则。不要判断剧情好坏，不要推测不可见章节，不要把比喻、梦境、预言或角色谎言直接当作客观事实。每条事实必须绑定原文短引文；无法确认时标记 uncertain。
```

输出必须匹配 `StoryScene[]`、`StoryEvent[]`、`StoryFact[]` 的局部字段。实体 ID 先使用当前 chunk 临时 ID，由 Reduce 阶段消歧。

### 5.2 Reducer：消歧与状态合并

职责：

- 合并人名、别名、称谓和同一地点。
- 保留冲突版本，不用后出现的事实覆盖先前事实。
- 生成事实有效区间。
- 区分叙事顺序和故事内时间。
- 对无法全局确认的关系保留 `unknown`。

### 5.3 Candidate detector：规则优先

确定性规则至少包含：

- 时间图存在有向环。
- 同一事件同时满足互斥的 before/after 关系。
- 年龄/日期/持续时长计算不可能。
- 同一人物在重叠时间位于互斥地点。
- 人物使用某知识的场景早于获得该知识的事件。
- 规则明确否定某能力，但后续在无解释时使用。
- 高权重 setup 到书末仍为 open，仅标为候选。

### 5.4 Verifier：只复核候选

Verifier 输入只包含：候选 claim、两侧局部上下文、相关 canon、必要的时间图邻居。禁止把整书摘要当作证据。

System 约束：

```text
你是叙事一致性复核器。判断给定候选是否被证据支持，并主动检查倒叙、梦境、预言、转述、角色撒谎、不可靠叙述、时间跳跃、合理成长和作者明确设定等替代解释。只能返回 verified、needs_human 或 dismissed。verified 必须说明两侧证据为何不能同时成立；存在合理解释但文本未确认时返回 needs_human。
```

Verifier JSON：

```json
{
  "status": "verified|needs_human|dismissed",
  "reason": "简明复核理由",
  "alternativeExplanations": ["可能解释"],
  "evidenceAnchorIds": ["anchor-id-a", "anchor-id-b"],
  "confidence": 0.0
}
```

### 5.5 Editorializer：排序与行动

只对 `verified` 和高置信 `needs_human` 生成读者影响与修复动作。排序公式由服务端计算：

```text
priority = severity_weight * confidence * narrative_span * reader_visibility
```

同类问题聚合展示，默认最多把 3 个问题推到顶部。不得自动生成整章重写；只生成修复范围、需要保留的事实和复诊检查点。

## 6. 对话统计协议

对话统计必须在文本标准化之后、模型调用之前运行。解析器输出 token 区间而不是只输出最终比例，以便点击回原文和处理嵌套引号。

测试至少覆盖：

- 中文弯引号、直角引号、双直角引号、半角双引号。
- 跨段对话。
- 引号内嵌引号。
- 书名号不是对话。
- 系统面板、短信、书信和内心独白的排除配置。
- 未闭合引号产生 warning，不静默吞掉后文。

## 7. 缓存与增量分析

缓存键至少包含：

```text
schemaVersion
normalizedTextHash
chapterSegmentationHash
profiles
preferences
canonVersion
extractorModel
verifierModel
promptVersion
```

修改单章时只重跑该章 Map，并重算受影响的实体、时间图邻居、剧情线和候选；不要默认重跑全书。任何结果都必须保存 `coverage` 和 prompt/model 版本。

复用现有 `CachedBookAnalysis`，把 `storyAudit` 作为 `BookAnalysisResult` 的可选字段缓存。禁止新增内容相同的 `CachedStoryAudit`。项目状态只保存 `bookJobId`、作者复核状态和必要索引，不复制整份正文或整份审计结果。

## 8. 降级与失败行为

- 模型不可用：仍返回对话统计和可确定计算的结构数据。
- 部分章节失败：返回 `isPartial: true`，列出未分析章节，不生成“全书未回收”等结论。
- 证据定位失败：降级为 `needs_human` 或丢弃候选。
- 时间无法归一化：保留相对关系，不强行生成日期。
- 实体消歧冲突：保留多个实体并发出低优复核任务，不自动合并。

## 9. Golden 数据要求

至少新增以下人工标注 fixture：

1. 线性时间、无冲突。
2. 明确年龄矛盾。
3. 倒叙但无冲突。
4. 同时异地冲突。
5. 人物提前知道秘密。
6. 合理人物成长，不应报人设冲突。
7. 伪装/撒谎，不应覆盖客观事实。
8. 伏笔暂未回收但文本未完结，只能 needs_human。
9. 多种中文引号和未闭合引号。
10. 单章变更后的增量复算。

每个 finding fixture 必须标注期望 category、status、证据 anchor 和允许的替代解释。

SIA-012 precision 验收集使用单独的 `story-audit-evaluation-suite/v1` JSON
导入契约，只包含 `datasetId`、`source`、`minimumLabeledCasesPerBucket` 和
`cases[].finding.{id,category,severity}` + `cases[].label`。该契约不保存正文、
全文索引或人工 reviewState；`source` 只有为 `independent_editor_set` 且每个
precision 桶标注量充足时，评测报告才允许声明可用于验收。

## 10. 完成定义

- 共享类型、API 和 Web 使用同一 schema version。
- 所有模型输出经过结构校验和证据回查。
- 所有确定性统计有纯函数单测。
- 所有高优 finding 可以跳转到两侧原文。
- partial、模型失败和实体不确定都有显式降级路径。
- 通过各子项目 AGENTS.md 要求的 typecheck、lint、test、build 与 changeset。
