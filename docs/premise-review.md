# 立项审稿（阶段①）P0 + P1 落成记录

状态：P0（契约 + 端点 + 审稿页）2026-08-18 落地；P1（发动机卡落库 + 作者决策面板 + 阶段轨开关 + 导出补节）2026-08-19 落地，均通过全部质量门。当前代码状态以实际实现和测试为准。
适用范围：`packages/ai-core`、`services/api`、`apps/web`
目标读者：负责继续实现本项目的开发者或代码模型

> 产品约束：本文服从 [`product-doctrine.md`](./product-doctrine.md)，信息架构服从 [`information-architecture.md`](./information-architecture.md)。
> 立项审稿是编辑过程链的链头：它发生在"写第一章"之前，产出的是**编辑决定**（值不值得写），不是文本测量（写得好不好）。

## 0. 当前验收状态

| 交付物 | 状态 | 落点 |
| --- | --- | --- |
| `PremiseReviewResult` 契约 | 已落地 | `packages/ai-core/src/premise-review.ts`（含 changeset） |
| 审稿端点 + 两层俗套复核 | 已落地 | `services/api/src/modules/premise/` |
| 审稿页 + 工作台入口卡 | 已落地 | `apps/web/src/app/diagnose/idea` + `PremiseReviewCompose` |
| 发动机卡落库 + 作者确认面板 | 已落地（P1） | 见 §5 |
| 俗套点作者决策面板 | 已落地（P1） | 见 §5 |
| 阶段轨开关 + 导出补节 | 已落地（P1） | 见 §5 |

已通过验证命令（P0，2026-08-18）：

```text
pnpm -F @ai-novel-diagnosis/ai-core typecheck / lint / test (52) / build
pnpm -F api typecheck / lint / test (300)
pnpm -F web check / test (108) / build（路由表含 /diagnose/idea）
```

对应提交：`60b7871`（契约）、`df12ffa`（verificationNote）、`f2fc087`（coercion 下沉）、`9ed5a66`（端点）、`d500eef`（页面）。

已通过验证命令（P1，2026-08-19）：

```text
pnpm -F @ai-novel-diagnosis/ai-core typecheck / lint / test (55) / build
pnpm -F api typecheck / lint / test (311)
pnpm -F web check / test (115) / build
```

对应提交：`8398665`（ai-core 卡契约）、`d80336d`（api 持久化与端点）、`31dc03f`（api 导出补节）、`27e897a`（web 确认闭环）、`56047b3`（web 阶段轨与导出）。

## 1. 这个功能为什么存在

三个事实推出了这个功能：

1. **模型是谄媚的。** LLM 写作流畅、夸奖廉价：让它评估一个灵感，它倾向产出"很有潜力，可以试试"式的空话。
   它从不做真实编辑每天都做的事——劝退。产品如果只把模型接成一个"鼓励器"，
   就把最贵的判断（这本书值不值得投入几个月）留给了最没有判断力的一方（刚想到一个点子的作者）。
2. **原链路缺链头。** 诊断台原有的链路是"初诊 → 改稿 → 复诊 → 沉淀"，全部发生在**已经写了正文之后**。
   一个不成立的发动机（无欲望、无阻力、设定依赖）写三十章才会暴露，而审稿本可以在五分钟内拒绝它。
   信息架构文档把这列为阶段①空位（[`information-architecture.md`](./information-architecture.md) §3）。
3. **需要的是审稿人，不是写手。** 同一模型自写自评无法证明有效——裁判和球员不能是同一个人
   （doctrine 对 AI 辅助写作者的"不应承诺"栏明确排除了这一点）。所以立项审稿的产出是
   **对作者灵感的审计与可反驳的重述**，而不是替作者把灵感扩写成大纲。Writer Agent 方案因此被否决。

## 2. 设计决策与理由

每条决策都曾被其他方案竞争过；记录被否方案是为了防止它们被原样重提。

### 2.1 三态判定，不打分

`engineVerdict: "solid" | "fixable" | "not-worth-writing"`。

- **为什么不是 1-10 分**：分数是测量，测量要求标尺可复现；"灵感质量 7.2 分"没有任何可解释含义。
  三态是编辑决定：签、修、毙。真实编辑立项会上也只有这三种动作。
- **为什么留 fixable**：纯二元（写/不写）会把大量"发动机成立但有俗套点"的灵感错杀到重写区。
  fixable 的语义是"值得写，但先修这几处"——它携带行动指向。
- **可反驳性约束**：`not-worth-writing` 必须由俗套证据与四层审计支撑（提示词明文要求），
  不允许裸拒绝；这是对"AI 劝退权"的制衡——模型可以毙，但必须出示尸体解剖报告。

### 2.2 四层审计：engine / desire / conflict / irreducibility

| 层 | 回答的问题 | 抓住的失败模式 |
| --- | --- | --- |
| 故事发动机 | 欲望与障碍持续对撞，能否自己产出情节 | "需要作者不断喂事件"的静态设定 |
| 主角欲望 | 想要什么，是否具体且强烈 | "主角只想平静生活"式无欲望开局 |
| 持续冲突 | 谁在阻止，压力是否持续升级 | 冲突一次性的爽文开头 |
| 不可替代性 | 换掉全部设定后故事是否仍然成立 | 设定依赖——换皮后什么都不剩 |

- **为什么恰好这四层**：前三层是发动机的三要素（欲望、阻力、对撞的自持性）；
  第四层是网文特有的陷阱——设定 wow 不等于故事成立。一个只能靠金手指设定撑住的灵感，
  在同类设定泛滥时没有任何残值。
- **层的元数据（标签与问题文案）放在 ai-core 常量 `PREMISE_LAYER_META`**，
  api 提示词与 web 审计卡都从它取值——两侧的层定义永远不可能漂移。

### 2.3 发动机契约：重述而非评价

结果里最重的字段不是任何评价，而是**编辑对作者故事的重述**：核心冲突、主角欲望、对立阻力、
不可替代性测试、读者钩子问题，全部用可反驳的一句话写出。

- **为什么重述比评价重要**：评价作者的灵感没有产出；重述把模糊的脑内图景钉成五条可对照的陈述。
  作者后续每写一章都能回来问"我还在写这个故事吗"。确认后的重述就是发动机卡（P1 的落库对象）。
- **为什么叫"契约"**：它是编辑与作者的约定——写偏了不算错，但要知道自己偏了。

### 2.4 俗套证据必须锚定作者原文（结构性反幻觉）

每条俗套判定的 `evidence[].quote` 必须是作者提交灵感的**连续子串**。这不是提示词请求，是服务端硬校验：
[`premise-verifier.ts`](../services/api/src/modules/premise/premise-verifier.ts) 用子串检查过滤引文，
对不上的一律剔除；引文全灭的判定整条拒绝并写入 `verificationNote`。

- **为什么**：审稿最恶劣的失败模式不是判断错，而是**指控作者没写过的东西**（"你的主角是无敌流"
  ——作者根本没写）。子串校验让模型在结构上无法编造证据：引文要么真在原文里，要么整条判定作废。
- **这是 story-audit 未知锚点规则的前提版**：story-audit 用章节偏移锚点，premise 没有章节，
  灵感全文就是唯一的锚定空间，所以校验退化为子串匹配——更简单，同样不可贿赂。
- **被否方案**：让模型返回偏移量再服务端截取。灵感文本短，子串匹配已零成本全覆盖，
  偏移量引入了模型算术错误这一新的失败面，没有收益。

### 2.5 两层复核：机械层永远运行，LLM 层降级不阻塞

- **第一层（机械）**：即 2.4 的子串校验，零成本、确定性、无模型也运行。
- **第二层（LLM 二审）**：非 mock 供应商时，每条幸存判定送独立复核
  （findingId 回显校验、`verified/needs_human/dismissed` 三态、0.85 置信度门槛——
  低于门槛的 verified 降级为 needs_human）。复核抛错只把该条降回 candidate，**永不阻塞审稿本身**。
- **为什么镜像 story-audit 的 verifier 形状**（`forProvider` 绑定、计数 summary、never-block）：
  这是仓库已验证的反谄媚模式，两个模块共享同一套语义，作者决策面板（P1）可以复用同一套状态机。
- **与 story-audit 的一个刻意差异**：premise 俗套点**没有 confidence 字段**。审稿判定的强度由
  "引文是否可定位 + 复核结论"表达；再加一个模型自报的小数只是又一个装饰性数字。
  复核置信度只在服务端参与门槛判定，不外露。

### 2.6 升级方向：只换核心冲突，三轴封顶

`upgradeDirections` 最多三条，orientation 限定 `emotion / intrigue / war`（情感/权谋/战争），
每条必须给出 `changedConflict`（替换后的核心冲突）与保留元素。

- **为什么只允许换冲突**：审稿的价值是"在作者已有积累上翻新"，不是"给你个新故事"。
  允许新增设定/金手指/人物的建议会诱导作者推倒重来——那是写手行为，不是编辑行为。
- **为什么三个方向**：这是网文品类里经过验证的三条冲突轴（关系压力、信息博弈、生存压力），
  覆盖绝大多数题材的核心冲突升级路径；开放式"任意方向"会让建议退化为头脑风暴。
- **为什么必须写保留元素**：让作者看见"你已写的东西不白写"，这是拒绝谄媚之后仍能成立的鼓励方式。

### 2.7 mock 路径：诚实的演示占位

mock provider 返回的审稿结果全部字段自称"演示数据"，`oneLineVerdict` 明示"切换真实模型后重新审稿"。
引文取灵感前 24 字——通过子串校验，让 UI 的证据渲染路径在演示模式下也是真的。

- **为什么**：演示模式的唯一职责是验证报告结构可用；伪造一个像真判断的 mock 结果
  会诱使作者据此决策（quick-review 的 mock 有同样的纪律）。

### 2.8 同步端点，不建 job

`POST /api/v1/analysis/premise-review`，30-60 秒内同步返回。

- **为什么不用 book-analysis 的 job 系统**：job 为"整书多阶段、分钟级"设计；
  立项审稿输入 ≤4000 字、单阶段、单次调用，异步化只增加轮询复杂度没有任何收益。

### 2.9 P0 不落库，阶段轨开关保持关闭（P1 已解除）

P0 阶段审稿结果只存在于页面 local state；`deriveBookStage` 的 `premiseReviewEnabled` 缺省 false，
阶段①在轨上仍是虚位（工作台通过入口卡提供可发现性）。

- **为什么结果不落库**：P0 要验证的是**判断质量**（提示词是否真给出有用的编辑决定），
  先持久化会把未验证的判断固化成资产。验证通过后 P1 再落发动机卡。
- **为什么开关不开**：轨的里程碑判定是 `engineCard.status === "confirmed"`——没有发动机卡落库，
  就没有任何途径把阶段①标记为达成；此时打开开关等于让所有存量书籍（包括复诊到一半的）
  永远停在"先审这个故事值不值得写"。这是 [`information-architecture.md`](./information-architecture.md) §4 记录的约束。
- **P1 状态**：前置条件已满足（发动机卡可落库可确认），`ProjectCurrentPage` 调
  `deriveBookStage` 时传入 `premiseReviewEnabled: true` 与 `engineCardStatus`，
  阶段①正式产生待办与里程碑。

### 2.10 契约下沉 ai-core，复核编排留在 api

类型与层元数据在 ai-core（`PremiseReviewResult` + 常量）；两层复核的编排函数、LLM verifier、
提示词、JSON Schema 都在 api 模块内。

- **为什么**：web 与 api 必须共享同一个结果契约（否则 UI 渲染和端点输出会漂移）；
  而复核编排绑定 `ModelProviderService`，是服务端职责，进 ai-core 会把 Node/HTTP 依赖带进纯库。
  这与 story-audit 的切法完全一致（`StoryAuditResult` 在 ai-core，verifier 在 api）。

## 3. 落点与数据流

```text
/diagnose/idea（web，页面态）
  └─ requestPremiseReview()  POST /api/v1/analysis/premise-review
       └─ PremiseReviewService.review()
            ├─ mock  → 确定性演示结果（不调模型、不进复核）
            └─ 真实  → jsonSchema 约束 chat → parseJsonWithRepair
                       → normalize（verdict 枚举硬校验、四层补全、引文清洗）
                       → verifyPremiseClicheFindings()
                            ├─ 子串校验（机械，永远运行）
                            └─ PremiseLlmVerifier.forProvider()（LLM 二审）
                       → 结果带 verification 计数返回
```

DTO 边界：`premiseText` 20-4000 字（下限过滤"帮我审：重生"式空输入；上限因为这是灵感不是大纲——
大纲属于阶段②结构）。`genre` 可选提示。`provider` 缺省走 shared-gpu（与 quick-review 一致）。

UI 渲染的每个状态都有出处：三态横幅（verdict）、五条契约卡（重述）、四层审计卡（layers）、
俗套点（findings，引文块 + 复核状态徽章 + 被拒披露文案）、升级方向（directions，三轴标签）。

## 4. 边界（本功能不做的事）

- 不替作者扩写灵感或生成大纲（那是写手，见 §1.3）。
- 不承诺市场成功：三态判定是编辑工艺判断，不预测流量/签约（doctrine 可信度排序）。
- 不替作者保管判断：审稿结果本身不落库，落库的只有作者确认后的发动机卡与作者自己的
  俗套判定——编辑的判断交给作者裁决后才成为病历资产。
- 俗套判定没有"编辑撤回"动作：作者侧四态（确认俗套/作者意图/误报/搁置）是终态语义，
  重新审稿（新 reviewId）会开启新一轮判定，旧判定按 reviewId 隔离不被覆盖。

## 5. P1 落成记录（闭环阶段①）

P1 于 2026-08-19 落地，四个子项及关键设计决策：

1. **发动机卡落库**：作者在审稿页编辑（预填编辑重述）后以 `draft`/`confirmed` 两种动作保存。
   - 契约类型 `PremiseEngineCard` 在 ai-core（与 story-audit 快照同构：api 的 repository 直接
     alias ai-core 类型，不复制定义）。
   - 每书 0..1 张：`projectId` 主键 + `onConflictDoUpdate` upsert（区别于 story-audit
     finding review 的三列复合键）——重述会随重审更新，确认动作可重做（改写后再确认即覆盖）。
   - 端点在独立 `PremiseAssetsController`（`analysis/workspace/premise/*`），避免撑爆
     workspace.controller 的 ≤50 行纪律。
   - 确认时服务端补 `confirmedAt`（已有则保留，支持草稿→确认→改写→再确认不丢首次时间）。
2. **作者决策面板**：每条俗套点下方四个动作（确认俗套/作者意图/误报/搁置），形状复用
   story-audit finding review。
   - `PremiseReviewResult.reviewId`（服务端每次审稿盖 uuid，镜像 `StoryAuditResult#auditId`）：
     决策按 `(projectId, reviewId, findingId)` 复合唯一落库，重审永不混淆两轮判定。
   - 引文被服务端剔除的 finding 不渲染决策行——没有可反驳证据的判定不允许作者背书。
   - 无 reviewId 的旧结果决策行禁用（灰置而非隐藏，披露"这一轮不能判"）。
3. **打开轨开关**：`ProjectCurrentPage` 传 `premiseReviewEnabled: true` +
   `engineCardStatus: projectEngineCard?.status`，阶段①达成判定 = 存在 confirmed 卡。
4. **导出补节**：api（`buildWorkspaceProjectMarkdown`）与 web（`buildProjectExportMarkdown`）
   双侧导出均新增「## 故事发动机」节——状态/审稿判定/题材/确认时间 + 概述引文 + 契约五条；
   无卡时输出占位文案，节序固定在项目概览之后、故事体检之前。

## 6. 维护规则

- 层定义、三轴方向、verdict 词汇表改动 = ai-core **破坏性变更**（改 `PREMISE_LAYER_META`
  等于同时改 api 提示词与 web 渲染），走 changeset + 双侧测试。
- 复核语义（子串规则、置信度门槛、降级行为）改动必须同步更新
  [`premise-verifier.spec.ts`](../services/api/src/modules/premise/premise-verifier.spec.ts)，
  该 spec 是这些规则的成文法。
- 提示词调整先在 `/diagnose/idea` 用真实模型人工验几轮再提交——本功能的核心风险是判断质量，
  不是代码结构。
