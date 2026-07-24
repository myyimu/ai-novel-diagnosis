# 三栏布局

三栏布局服务 [`../../docs/product-doctrine.md`](../../docs/product-doctrine.md) 定义的编辑闭环；它不能把历史、指标或 AI 结论放在比原文证据、作者决定和修改动作更高的视觉层级。

三栏布局是 Web 控制台的可选布局模式，用于在诊断和研究场景中同时展示输入、结果和上下文面板。

## 启用方式

设置环境变量：

```text
NEXT_PUBLIC_USE_THREE_COLUMN_LAYOUT=true
```

未设置时使用经典布局。

## 布局结构

```text
+------------------+--------------------------+------------------+
| 左侧导航/上下文   | 主内容区                 | 右侧检查器        |
| 可调整/可折叠     | 原文/任务/真实版本        | 证据/替代解释/决定 |
+------------------+--------------------------+------------------+
```

三栏主体组件位于：

- `src/components/workspace/ThreeColumnWorkspaceShell.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/novel-critique-console.tsx`

## 路由关系

当前产品导航按四个工作区组织，三栏布局不再维护一套独立导航模型：

- 诊断：`/diagnose/quick`、`/diagnose/deep`、`/diagnose/score`、`/diagnose/evidence`
- 项目：`/project/current`、`/project/revisions`、`/project/methodology`、`/project/export`
- 研究：`/research/book`、`/research/compare`、`/research/patterns`、`/research/materials`
- 设置：`/settings/provider`、`/settings/dashboard`、`/settings/history`

旧视图名到新路由的映射由 `src/lib/workspace-routes.ts` 维护。

## 维护原则

- 三栏布局是呈现方式，不是新的业务信息架构。
- 新功能应先确定归属工作区，再决定是否适合三栏展示。
- 右栏只承载当前选中对象的证据、作者操作和版本状态，不做常驻指标墙。
- 修改旧视图名、工作区路由或导航项时，同步更新 README 和 `workspace-routes.ts`。
