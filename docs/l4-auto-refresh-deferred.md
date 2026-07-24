# L4 — Auto-refresh / Incremental Update（已决策延后）

> 本文是后置技术决策，服从 [`product-doctrine.md`](./product-doctrine.md)。自动刷新只能更新“待确认规则候选”，不得因为样本数量增加就自动把规则升级为真理或写入作者个人方法库。

## 一句话

当书库新增一本样本时，**哪些受影响的蒸馏 skill 需要自动重算**，以及**重算时机**。

## 为什么需要 L4

现在 `POST /analysis/research/distill` 是**手动触发**的：作者选一批 jobId，端点现算。这在 MVP 阶段够用，但一旦作者积累 50+ 本书后，手动管理哪个 skill 需要刷新会变成负担：

- 新增一本有权研究的同作者样本 → 相关蒸馏候选重新计算证据覆盖和样本一致性
- 同一题材样本增多 → 可以提高“样本支持度”，但不能只按数量把编辑规则升级为确定结论
- 新增样本带来了新规则 → 需要重新跑 intersection threshold 并决定哪些规则晋升为 high-confidence

## 设计方向（未实现）

### 方案 A：CDN-style 即时刷新

```
POST /analysis/book/jobs/:jobId/complete
    ↓
完成通知 → EventBus 发出 job.completed 事件
    ↓
订阅者查询所有受影响的 distilled skills
  (SELECT DISTINCT groupBy, groupValue 
   FROM distilled_skills 
   WHERE ... GROUP BY author/genre/platform)
    ↓
对每个受影响的 skill 重新跑 aggregate + compile
    ↓
写回 distilled_skills 快照表
```

**前提**：需要 `distilled_skills` 持久化表（目前是 on-the-fly 计算，没有快照）。

### 方案 B：延迟批处理

```
每天凌晨 2:00 或低负载窗口：
    遍历过去 24h 新增的 succeeded jobs
    按 author/genre/platform 分组
    对每个组重新跑 aggregate
    如有变化 → 更新快照 + 通知
```

### 方案 C：手动"一键刷新"

```
UI 上对每个 skill 显示 "最后更新: 2026-06-27"
旁边有 "立即刷新" 按钮
点击后单条重跑 aggregate + compile
```

**推荐 MVP 用 C**，等用户反馈需要自动化再升级到 B，最后到 A。

## 前置依赖（L4 之前必须完成）

| 前置项 | 原因 |
|---|---|
| `distilled_skills` 持久化表 | 现在 on-the-fly 算；要增量更新必须先存快照 |
| DTO 加 `distilledAt` / `sourceJobHashes` | 判断"是否需要重算"的增量信号 |
| 单元测试覆盖增量场景 | 增量 = 加入新样本后，旧 skill 哪些规则降权、哪些晋升 |

## 预估工作量

| 子任务 | 工作量 |
|---|---|
| schema 设计 + migration | 0.5 天 |
| 增量重算算法（新样本 vs 旧快照 diff） | 1.5 天 |
| 触发机制（事件/定时/手动） | 1 天 |
| 测试 | 1 天 |
| **合计** | **4 天** |

## 决策记录

| 决策 | 选项 | 选否 | 原因 |
|---|---|---|---|
| 首次实现 L4 | A/B/C | 否 | 应先完成编辑规则来源、人工确认、真实版本复诊和评测闭环，再自动刷新候选 |
| 在 L3 发版后评估 | 是/否 | 待定 | 看真实用户是否会累积 10+ 本同作者样本 |

## 首次蒸馏日期

> 2026-06-27 — L3 上线，`POST /analysis/research/distill` 可用。  
> L4 追加按需触发。
