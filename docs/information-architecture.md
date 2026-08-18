---
title: 信息架构：以书为锚的旅程模型
status: authoritative（从属于 product-doctrine.md，冲突时以产品教义为准）
version: 0.1.0
last_updated: 2026-08-18
---

# 信息架构：以书为锚的旅程模型

本文档定义控制台的信息架构（IA）：锚对象、旅程阶段轴、派生规则、导航映射和放置规则。
它把 [product-doctrine.md](./product-doctrine.md) 中的编辑过程链（标准 → 证据 → 作者确认 → 改稿 → 复诊 → 沉淀）
兑现为界面上可见的组织原则。任何新功能进入产品前，必须先在本文档中找到自己的位置；
找不到位置的能力按教义视为独立卖点，不予进入。

## 1. 组织原则

- **第一层组织原则是"书 + 它的旅程"，不是工具类别。** 每本书是一份持续生长的病历
  （诊断台隐喻），每次诊疗（初诊、复诊、审稿）都是病历上的一次记录。
- 诊断、研究、设置等工具间保留为工作区外壳，但它们是**阶段的手段**，不是导航的第一层。
- IA 必须回答两个问题：**我在哪**（这本书处于哪个阶段）、**下一步做什么**（最早未清的待办）。

## 2. 锚对象模型

锚对象是**书（Project）**，其余一切都是病历上的记录。研究库是跨书的证据侧栏，
不挂在任何一本书下，向①③供给俗套与模式证据。

```text
                    ┌─────────────────┐
                    │  书 / Project    │  ← 唯一锚对象（病历本体）
                    └────────┬────────┘
        ┌──────────┬─────────┼──────────┬───────────┐
        │          │         │          │           │
 发动机契约     诊疗记录    版本      故事体检     方法论卡
（规划中,①）  Session   Version   StoryAudit  MethodologyCard
  0..1        1..N      1..N      0..1        1..N
              retestStatus  V1/V2   (via bookJobId)
```

当前只有"发动机契约"是规划中的新对象（立项审稿的产物，见阶段①），其余对象均已落库。

## 3. 旅程阶段轴

| 阶段 | 回答的问题 | 完成产物（进病历） | 数据判定 | 路由归宿 | 现状 |
| --- | --- | --- | --- | --- | --- |
| ① 立项 | 这本书值得写吗 | 作者确认的发动机契约 | `engineCard.status === "confirmed"` | `/diagnose/idea` | 审稿页已上线（P0）；发动机卡落库与作者确认属 P1 |
| ② 结构 | 怎么安排章节 | 章节合同 | 有章节合同 | 暂空 | 后置到 P1，轴上留虚位 |
| ③ 正文与初诊 | 写得好不好 | 诊断会话 + 证据 + 作者决定 | 存在任意 `RevisionSession` | `/diagnose/quick` 等 + `/project/health` | 已有 |
| ④ 版本与复诊 | 改进了吗 | V2 + completed 复诊 + 对比 | `session.retestStatus` 走完 pending→completed | `/project/revisions` | 已有（服务端复诊） |
| ⑤ 沉淀与交付 | 学到什么可复用 | 方法论卡 + 导出包 | 存在方法论卡 | `/project/methodology` + `/project/export` | 已有 |

③④⑤的判定字段今天全部在库中——阶段轴不是设计愿望，是对现有数据的重新读法。

## 4. 派生规则

阶段轨由纯函数 `deriveBookStage`（`apps/web/src/lib/book-stage.ts`）从既有资产派生，
**零 schema 变更**。输入为会话列表、方法论卡数量、发动机契约状态和立项审稿可用开关；
输出为五个阶段的 `reached / pending / available` 状态与"下一步"动作（最早未清待办优先）：

```text
nextAction 阶梯（从最早未清项开始）：
1. 立项审稿已上线 且 未确认发动机契约  → ①  先审这个故事值不值得写   /diagnose/idea
2. 存在 pending 复诊会话               → ④  完成待复诊的版本对比     /project/revisions
3. 尚无任何诊断会话                    → ③  贴第一章做初诊           /diagnose/quick
4. 有会话、无 pending、无 completed    → ④  改稿后保存 V2 触发复诊   /project/revisions
5. 有 completed 复诊、无方法论卡       → ⑤  沉淀方法论卡             /project/methodology
6. 全部达成                            → ③  写下一章并初诊           /diagnose/quick（章节循环）
```

约束：

- 阶段②恒为 `available: false`，不参与待办阶梯，P1 落地后接入。
- 立项审稿闭环未落库前（`premiseReviewEnabled` 缺省），阶段①不产生待办：审稿页已上线，
  但发动机卡尚无持久化，开启开关会让所有存量书籍永远停在"待审稿"。发动机卡落库后再开启。
- 禁止用估算公式伪造旅程进度（如"资产数 × 系数"）；进度只能来自上表的数据判定。

## 5. 导航映射

第一层组织原则换成"书"，但**不改路由**，只改归属和入口：

```text
顶层导航（目标）              现有路由的去向
─────────────────           ─────────────────────────────
书架（/ → /project/current） /project/current → 书首页（阶段轨 + 待办 + 最近记录）
研究库 /research/*           原样保留，定位 = 跨书证据侧栏
设置   /settings/provider   原样保留

书内导航 = 阶段轴①-⑤         /diagnose/* → ③的工具页
                           /project/revisions → ④
                           /project/health → ③的整书视图
                           /project/methodology、/project/export → ⑤
```

导航权重的调整（如 `/` 跳转目标让位给阶段①）必须由使用数据驱动，不预先调整。

## 6. 放置规则（治理条款）

任何新能力进入产品前必须回答三问，并把答案登记到本文档的阶段轴或侧栏定义中：

1. **属于哪个阶段？** ①-⑤ 或研究库侧栏；答不出 = 独立卖点 = 按教义拒绝。
2. **锚定哪个对象？** 书 / 会话 / 版本 / 研究库——决定它写进谁的病历。
3. **产出什么进病历？** 契约 / 证据 / 决定 / 版本——决定下游环节能否反查。

判例：

- 立项审稿：阶段① / 锚 = 书 / 产出 = 发动机契约 ✔
- 研究对比（research-compare）：侧栏 / 锚 = 研究库 / 产出 = 模式证据，供给①③的俗套判定 ✔

## 7. 实施现状

- 已实现：`deriveBookStage` 纯函数 + 测试（`apps/web/src/lib/book-stage.ts`）；
  书籍卡片上的阶段轨 UI（替换原估算进度条）；
  阶段①立项审稿（P0，设计决策见 [`premise-review.md`](./premise-review.md)）——
  `PremiseReviewResult` 契约（ai-core）、
  `POST /analysis/premise-review` 端点（两层俗套复核：原文引文定位 + LLM 二审）、
  `/diagnose/idea` 审稿页与工作台入口卡。
- 待实现：发动机卡持久化与作者确认面板（阶段①闭环，之后才打开
  `premiseReviewEnabled`）；阶段②结构设计（P1）；导出 Markdown 增加"故事发动机"节。
