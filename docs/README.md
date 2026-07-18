---
title: AI网文诊断台文档索引
status: active
version: 1.0.0
last_updated: 2026-07-18
---

# AI网文诊断台文档索引

本文档是仓库文档入口。后续 AI 和开发者应优先阅读这里列出的权威文档，不再从旧的一次性评审或迁移计划里推断产品方向。

## 必读顺序

1. [产品总原则](./product-doctrine.md)
2. [技术架构](./architecture.md)
3. [快速诊断 V3 执行规格](./quick-diagnosis-v3-execution-spec.md)
4. [故事体检产品设计](./story-intelligence/README.md)
5. [故事体检实施计划](./story-intelligence/implementation-plan.md)
6. [故事体检模型协议](./story-intelligence/model-protocol.md)
7. [故事体检机器执行计划](./story-intelligence/execution-plan.yaml)

## 当前产品主线

```text
快速诊断
-> 原文证据
-> 改稿 Prompt
-> 真实版本复诊
-> 方法论沉淀
-> 整书故事体检
```

所有新文档都必须说明自己属于哪一段链路。不能说明的文档，不应新增。

## 文档分层

| 层级 | 文档 | 用途 |
| --- | --- | --- |
| 产品原则 | `product-doctrine.md` | 约束所有产品和工程文档的方向 |
| 架构 | `architecture.md` | 说明工作区、服务、路由和数据流 |
| 快速诊断 | `quick-diagnosis-v3-execution-spec.md` | 单章急诊和改稿复诊的工程规格 |
| 故事体检 | `story-intelligence/*` | 整书一致性、结构、人物、剧情漏洞等能力 |
| 示例 | `examples/*` | 展示诊断输出形态 |
| 资产 | `assets/*` | README 和文档截图 |

## 已合并并删除的旧文档类型

以下类型不再作为权威入口维护：

- 早期产品定位讨论
- 一次性内容清晰度评审
- 一次性拆书可理解性评审
- UX 重构迁移计划
- 旧版工作流改造草案
- Web 重构临时计划

这些内容的有效结论已经合并到产品总原则、架构文档、快速诊断规格或故事体检文档中。
