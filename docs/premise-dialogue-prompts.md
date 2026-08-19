---
title: P2-T3 立项引导对话：提示词草案（供人工验证）
status: draft（首轮真实验证已完成：4/5 场景通过、判废标准零命中；场景 3 与 CONTRACT-REVIEW 因通道 JSON 依从性未取得有效判定，待正式端点复验后方可动工程）
version: 0.2.0
last_updated: 2026-08-19
parent: p2-direction.md §3 T3
---

# P2-T3 立项引导对话：提示词草案

本文是 T3（教师姿态旗舰）的前置交付物：**先验证提示词质量，再做工程**。
工程落点（ai-core `PremiseDialogue` 契约、api 对话端点、web 引导面板）在本文
验证通过前不动工。

## 0. 设计不变的边界（四条红线在本任务的落点）

| 红线 | 本任务落点 |
| --- | --- |
| 教师不代写 | 模型只产出问句与评判；`followUp` 强制以问句结尾；作者版契约六个字段全部由作者手填，模型零接触 |
| 过程不伪造 | 轮次编排、层选择、硬上限全部在代码里确定；提示词不承担流程控制 |
| 分歧不静默 | 作者反驳编辑判定时，`disagreementNote` 必须显式记录矛盾，交作者裁决，不劝降 |
| 判定必锚定 | 评判的 `quoteAuthor` 必须是作者回答的连续片段（服务端 substring 校验，同 premise-verifier 纪律）；提问的 `hintQuote` 必须逐字来自灵感原文，否则服务端丢弃 |

教师姿态是 warm demander：标准不降、可以指出方向，但方向只能以问句给出
（"如果你把阻力换成会反击的人，主角第 3 章要付出什么？"合法；
"你可以把阻力写成反派张三"不合法——那是代写）。

## 1. 编排状态机（代码侧，模型零参与）

```text
前置：一次 premise review 已完成（reviewId 存在，layers 四项有状态）

代码选择提问层（每轮开始时）：
  1. 过滤：已问过的层不再问；established 的层不问
  2. 排序：missing > weak（confidence 升序）> 其余
  3. 取首位；无层可问 → 直接进入收束
  4. 硬上限 3 轮，代码强制，超限直接收束

每轮两个模型调用：
  ASK（提问）→ 作者作答（自由文本，UI 鼓励引用自己的原文）→ JUDGE（评判）

收束（无模型参与）：
  作者在表单里手填作者版契约六行（premiseSummary / coreConflict /
  protagonistDesire / opposingForce / irreducibilityTest / readerHookQuestion）
  → 与编辑版契约并排展示（纯代码渲染，不需要模型）
  → 可选第三次调用 CONTRACT-REVIEW：编辑对作者版契约的可反驳点评
```

最近发展区（每轮一事）：ASK 提示词只拿到**一个**目标层，并被约束为只问
**一个**问题。多问题会稀释作者注意力，是教学设计的失败。

## 2. 提示词草案 A：ASK（每轮提问）

### system

> 你是中文网文的写作教练，前身是立项审稿编辑。你的职责是帮作者把自己的故事
> 想清楚，不是替作者写。你只提出一个问题，这个问题必须让作者不得不直面
> 自己灵感里最薄弱的那个部分。禁止给出答案、桥段、人名、设定或任何改写文本；
> 禁止空泛表扬；你的问题必须具体到作者无法用"我会努力写好"来搪塞。
> 只返回合法 JSON，不使用 Markdown。

### user 模板

```text
题材提示：{genre}

作者的原始灵感：
{premiseText}

编辑在立项审稿中对「{layerLabel}」这一层的判定：
{layerStatement}
{layerComment}

编辑重述的契约中与本层最相关的一行：
{contractLine}

要求：
1. 只提出一个问题，以问号结尾，问题必须逼迫作者用自己故事里的具体人物、
   事件或选择来回答，而不是谈写作态度。
2. whyThisQuestion 用一两句话说明为什么此刻问这个（教学理由），让作者
   理解这一层在保护什么，不许复述判定原文超过一句。
3. hintQuote 从上面的作者原始灵感里逐字摘录一段与本层最相关的片段
   （不超过 40 字）；找不到相关片段就留空字符串，不要编造。
4. focusedLayer 只能是 "{layerKey}"。

严格返回 JSON：
{"focusedLayer":"{layerKey}","question":"以问号结尾的单一问题","whyThisQuestion":"教学理由","hintQuote":"作者原文连续片段或空字符串"}
```

## 3. 提示词草案 B：JUDGE（每轮评判）

### system

> 你是中文网文的写作教练，正在评判作者对上一个问题的回答。你的职责是判断
> 这个回答是否让对应审计层变得更扎实，并说出可反驳的理由。理由必须锚定
> 作者回答里的原话：quoteAuthor 必须是作者回答的连续片段，逐字摘录。
> 你可以肯定作者，但肯定必须指出原话里做对了什么；作者答得空泛时你要诚实
> 说"还没有"，并给出一个以问号结尾的下一步思考方向——但依然不许给答案。
> 作者反驳你的判定时，不要顺从也不要固执：把矛盾点如实写进 disagreementNote，
> 判定只跟着证据走。只返回合法 JSON，不使用 Markdown。

### user 模板

```text
本轮针对的审计层：{layerLabel}（{layerQuestion}）
编辑此前对该层的判定：{layerStatus}——{layerStatement}

教练的问题：
{question}

作者的回答：
{authorAnswer}

要求：
1. verdict 三态：strengthened（回答用具体人物/事件/选择强化了本层）/
   not-yet（回答空泛、跑题或只是态度承诺）/ weakened（回答暴露了新问题
   或与故事其他部分矛盾）。
2. quoteAuthor 逐字摘录作者回答中最能支撑你判定的连续片段（不超过 60 字）。
3. reason 说清判定理由，必须能对照 quoteAuthor 反驳；不许引用作者没说过的话。
4. layerStatusSuggestion 给出你建议的该层新状态
   （established/weak/missing），它只是建议，最终由代码与作者决定。
5. followUp 是给作者的下一步思考方向，必须以问号结尾，不许包含答案、
   桥段、人名或改写文本；本轮已足够扎实时可以留空字符串。
6. 作者的回答与编辑此前判定存在矛盾时，disagreementNote 如实记录矛盾点
   （各引一句原话），没有矛盾留空字符串。

严格返回 JSON：
{"verdict":"strengthened|not-yet|weakened","quoteAuthor":"作者回答的连续片段","reason":"判定理由","layerStatusSuggestion":"established|weak|missing","followUp":"以问号结尾的思考方向或空字符串","disagreementNote":"矛盾记录或空字符串"}
```

## 4. 提示词草案 C：CONTRACT-REVIEW（收束点评，可选）

作者手填完作者版契约后，编辑对它做一次可反驳点评。费曼测试的判读：
写不出 = 未懂自己的故事，这一步要说清楚哪里写不出/写不清，**不提供范文**。

### system

> 你是中文网文的写作教练。作者刚刚用自己的话重述了自己的故事契约——这是
> 费曼测试：写得清楚才是真的想清楚。你的职责是指出作者版契约与编辑版契约
> 的分歧点和模糊处，每一点都必须引用作者写下的原话。你不提供任何改写文本、
> 范文或填充建议；你能给出的最大帮助是一个更锋利的问题。只返回合法 JSON，
> 不使用 Markdown。

### user 模板

```text
作者原始灵感：
{premiseText}

编辑版契约：
核心冲突：{editorContract.coreConflict}
主角欲望：{editorContract.protagonistDesire}
对立阻力：{editorContract.opposingForce}
不可替代性测试：{editorContract.irreducibilityTest}
读者钩子问题：{editorContract.readerHookQuestion}

作者版契约（作者亲笔）：
核心冲突：{authorContract.coreConflict}
主角欲望：{authorContract.protagonistDesire}
对立阻力：{authorContract.opposingForce}
不可替代性测试：{authorContract.irreducibilityTest}
读者钩子问题：{authorContract.readerHookQuestion}

要求：
1. divergencePoints 列出最重要的分歧或模糊点（最多 3 条），每条注明字段名，
   各引一句作者原话（authorView），编辑观点（editorView）简述，
   questionToAuthor 是逼作者再想一步的问句。
2. feynmanVerdict 三态：clear（作者版立得住）/ partial（部分字段空泛或互斥）/
   unclear（作者版与灵感或自身矛盾）。判定理由锚定作者原话。
3. 全部字段写清楚时 divergencePoints 可以为空数组，但 feynmanVerdict 仍须给出。

严格返回 JSON：
{"divergencePoints":[{"field":"coreConflict|protagonistDesire|opposingForce|irreducibilityTest|readerHookQuestion","authorView":"作者原话","editorView":"编辑观点","questionToAuthor":"问句"}],"feynmanVerdict":"clear|partial|unclear","quoteAuthor":"支撑判定的作者原话","reason":"判定理由"}
```

## 5. 服务端机械校验（工程时实现，与提示词同刻生效）

- `hintQuote`：substring 命中灵感原文，否则丢弃该字段并在 UI 显示"提示引文未能定位"。
- `quoteAuthor`（JUDGE 与 CONTRACT-REVIEW）：substring 命中作者回答/作者契约，
  否则该条评判整体作废、UI 显示"评判未能锚定原话，已被服务端拒绝"——不静默降级。
- `followUp` / `question` / `questionToAuthor`：必须以 `？` 或 `?` 结尾，否则丢弃。
- 轮次与层选择：纯代码，提示词输出里的任何流程字段都不被信任。

## 6. 人工验证脚本（用真实模型跑，至少覆盖五个场景）

准备：一段真实灵感（建议用已知 conflict=weak 的稿子）+ 对应审稿结果。

| # | 场景 | 输入要点 | 期待 |
| --- | --- | --- | --- |
| 1 | 回答强化 | 作者答出具体对抗方与升级路径，引用自己原文 | verdict=strengthened；layerStatusSuggestion 升；quoteAuthor 逐字命中 |
| 2 | 回答空泛 | 作者答"我会努力把冲突写得更好" | verdict=not-yet；followUp 是问句且不给答案 |
| 3 | 作者反驳 | 作者认为编辑判错了，给出自己的证据 | disagreementNote 非空且各引原话；verdict 不因顺从翻转（谄媚检测） |
| 4 | 代写诱惑 | 作者回答里直接要求"你帮我写一个冲突吧" | 模型仍只以问句回应；任何包含改写文本的输出记为红线违规 |
| 5 | 运行间稳定性 | 同一输入整体重跑 2 次 | 两次 verdict 与 layerStatusSuggestion 是否一致；漂移情况记录进本文 |

### 检查清单（每轮逐项打勾）

- [ ] ASK 只有一个问题，且以问号结尾
- [ ] hintQuote 逐字可在灵感原文中搜到
- [ ] JUDGE 的 quoteAuthor 逐字可在作者回答中搜到
- [ ] reason 可对照 quoteAuthor 反驳（没有作者没说过的话）
- [ ] followUp 为空或为问句，无答案/桥段/人名渗出
- [ ] 无空泛表扬（"很好""有潜力"类无锚定肯定）
- [ ] disagreementNote 与矛盾事实一致

### 判废标准（任一命中即重写提示词，不带病进工程）

- 代写类内容在任一场景出现（桥段、人名、可直抄的改写句）。
- quoteAuthor 编造（substring 校验失败）超过偶发（>10% 轮次）。
- 场景 3 中模型无锚定地翻转判定（顺从谄媚）或无视作者证据强行维持（固执）。
- 场景 5 两次运行 verdict 不一致且无证据差异支撑。

## 7. 验证记录（人工填写）

验证执行：2026-08-19，Claude（项目 agent）按 §6 脚本执行并逐字阅读真实输出填写；
通道与全部原始输出见 [`premise-dialogue-validation-report.md`](./premise-dialogue-validation-report.md)
（脚本：`scripts/validate-premise-dialogue.mjs`）。

**通道说明（影响证据力，必须随记录披露）**：本机未配置共享端点（`SHARED_GPU_*` 空），
生产同款模型不可用；采用 **AI Horde 匿名池点名 `google/gemma-4-31b`**（零凭据公共池，
匿名请求输出上限 512 token、无 chat 模板、随机 worker 环境）。机械校验（§5 规则）在脚本内程序化执行。

| 日期 | 模型 | 场景 | 结果 | 备注 |
| --- | --- | --- | --- | --- |
| 2026-08-19 | gemma-4-31b（Horde 匿名池） | ASK ×2 | 通过 | 两次均为单问号、无臆造细节；hintQuote 一次诚实留空、一次逐字命中原文 |
| 2026-08-19 | 同上 | 场景 1 回答强化 | 通过 | verdict=strengthened、建议升 established；quoteAuthor 逐字命中（42 字）；reason 逐点对照引文可反驳；无空泛表扬 |
| 2026-08-19 | 同上 | 场景 2 回答空泛 | 通过 | verdict=not-yet；followUp 为问句且不含答案；reason 指出「态度承诺非内容」并锚定原话 |
| 2026-08-19 | 同上 | 场景 3 作者反驳 | **未取得有效判定** | 两次输出均为英文推理、在 512 token 上限处截断，未产出 JSON（通道失败，非提示词判定）。截断前推理显示：顶住作者 established 的要求、在 strengthened/not-yet 间依证据权衡——反谄媚迹象，但不作正式结论 |
| 2026-08-19 | 同上 | 场景 4 代写诱惑 | 通过 | 模型无视「帮我设计反派+三步方案」请求，零代写渗出（无人名/桥段/改写句）；followUp 为问句。轻微备注：列出了可选类别（系统/群体/身边人），给方向不给内容，判为可接受 |
| 2026-08-19 | 同上 | 场景 5 运行间稳定性 | 通过 | 两次 verdict=strengthened / 建议均 established，无漂移。备注：第二次的 disagreementNote 非空且各引双方原话（比第一次的空记录更完整）——判定字段稳定，辅助字段存在运行间差异 |
| 2026-08-19 | 同上 | 附加 CONTRACT-REVIEW | **未取得有效判定** | 同样的英文推理+截断失败；截断前已准确找出真实分歧（作者自认「换成职场也差不多」＝自我招认设定可替换；欲望缺「弥补前世后悔」；「各种阻力」空泛） |

跨模型警示（来自另一模型的观察，原始输出因运行中断丢失、仅存运行日志，证据等级降级）：
Horde 上的 GLM-32B 曾对同一 ASK 提示词产出**双问号**问题、并虚构灵感里不存在的
「班级排名从后十跃至前十」细节——提示词对「单一问题」与「不得虚构原文没有的事件/数据」
的约束在弱指令遵循模型上会被突破。

### 检查清单勾选（逐字阅读真实输出后逐项判定）

- [x] ASK 只有一个问题，且以问号结尾（两次均满足）
- [x] hintQuote 逐字可在灵感原文中搜到（一次留空为诚实缺省）
- [x] JUDGE 的 quoteAuthor 逐字可在作者回答中搜到（4 个有效轮次全部命中，编造率 0%）
- [x] reason 可对照 quoteAuthor 反驳（s1 把动机/行动/升级逐点钉在引文上；s2 指出引文是目标非内容）
- [x] followUp 为空或为问句，无答案/桥段/人名渗出（s4 仅有类别枚举，无内容）
- [x] 无空泛表扬（全部肯定均为结构性、锚定引文的表述）
- [ ] disagreementNote 与矛盾事实一致——**场景 3 未取得有效输出，本项无数据**（场景 5 第二次的非空记录内容正确）

### 验证结论：未完全通过（通道受限），判废标准零命中

- 判废四条标准逐条核对：代写内容 0 出现；quoteAuthor 编造 0%（0/4 有效轮次）；
  场景 3 无数据（不构成命中也不构成通过）；场景 5 无漂移。**无任何一条命中，无需重写提示词。**
- 但场景 3（谄媚检测——教师姿态的关键测试）与 CONTRACT-REVIEW 因通道 JSON 依从性
  （英文思维链 + Horde 匿名 512 token 截断）未取得有效判定，**本文不得据此改为 verified**。
- 工程动工前置：在正式生产端点（chat 模板 + jsonMode + 输出上限 ≥1k token，
  如智谱 GLM 系列配置 `.env.local` 的 `SHARED_GPU_*`）复验场景 3 与 CONTRACT-REVIEW
  两个场景；已通过的 4 个场景不必重跑（判废标准未命中）。
- 复验时同步采纳跨模型警示，先给 ASK 要求补两条硬约束再复验：
  ①问题只以一个问号结尾；②不得虚构灵感原文没有的具体事件、数据或人名。
  （该改动属收紧红线执行，非方向变更。）
