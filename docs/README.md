# 产品与研发文档索引

全仓文档共同服务一个方向：把成熟编辑的诊断、取舍、改稿和复诊方法，变成作者可检查、可执行、可验证的写作教练。

开始任何产品或研发任务前，先读 [`product-doctrine.md`](./product-doctrine.md)。它定义产品主线、科学边界、功能门槛和完整改稿闭环。

## 文档层级

### 第一层：不可偏离的产品约束

- [`product-doctrine.md`](./product-doctrine.md)：最高层产品原则与科学有效性门禁。
- [`feature-prioritization-and-design-slots.md`](./feature-prioritization-and-design-slots.md)：能力优先级与页面归属。

### 第二层：当前架构与核心链路

- [`architecture.md`](./architecture.md)：系统边界、数据流和工作区结构。
- [`quick-diagnosis-v3-execution-spec.md`](./quick-diagnosis-v3-execution-spec.md)：快速诊断的输入、模型输出、确定性后处理和兼容策略。

### 第三层：故事体检协议与实施记录

- [`story-intelligence/implementation-plan.md`](./story-intelligence/implementation-plan.md)：2026-07-17 实施前基线与任务范围记录；不是当前任务指令。
- [`story-intelligence/README.md`](./story-intelligence/README.md)：产品设计和页面融合。
- [`story-intelligence/model-protocol.md`](./story-intelligence/model-protocol.md)：事实、候选、复核和证据协议。
- [`story-intelligence/execution-plan.yaml`](./story-intelligence/execution-plan.yaml)：历史机器可读依赖图；代码状态以当前架构、测试和实现为准。

### 第四层：示例与延后决策

- `examples/`：示例只证明交互和契约，不作为模型准确率证据。
- `l4-auto-refresh-deferred.md`：后置技术决策，不改变产品优先级。

## 文档维护规则

1. 产品目标统一写成“编辑方法蒸馏 + 作者决策 + 真实改稿 + 可验证复诊”。
2. “读者流失、流量、留存”等无行为数据结论必须写成风险假设。
3. 分数和置信度不得写成客观质量或正确概率。
4. 新指标必须进入证据、作者确认、改稿和复诊链路，不能只增加图表。
5. 已完成、失效或被权威文档覆盖的迁移/评审稿直接删除；需要保留的历史决策改写成简短 ADR。
6. `AGENTS.md` 与 `CLAUDE.md` 由 One CLI 管理，不在产品文档重写范围内。
7. 运行指南、变更日志、安全策略等事实性文档只需保持准确，不强行重复产品叙事。
