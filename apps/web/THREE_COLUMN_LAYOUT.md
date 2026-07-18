# 三栏布局

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
| 左侧导航/上下文   | 主内容区                 | 右侧辅助面板      |
| 可调整/可折叠     | 当前视图主体             | 历史/资料/项目状态 |
+------------------+--------------------------+------------------+
```

三栏主体组件位于：

- `src/components/workspace/ThreeColumnWorkspaceShell.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/novel-critique-console.tsx`

## 路由关系

当前产品导航按四个工作区组织，三栏布局不再维护一套独立导航模型：

- 诊断：`/diagnose/quick`、`/diagnose/deep`、`/diagnose/score`、`/diagnose/evidence`
- 项目：`/project/current`、`/project/health`、`/project/revisions`、`/project/methodology`、`/project/export`
- 研究：`/research/book`、`/research/compare`、`/research/patterns`、`/research/materials`
- 设置：`/settings/provider`、`/settings/dashboard`、`/settings/history`

旧视图名到新路由的映射由 `src/lib/workspace-routes.ts` 维护。

## 维护原则

- 三栏布局是呈现方式，不是新的业务信息架构；故事体检也应先归入项目工作区，再决定是否使用三栏呈现。
- 新功能应先确定归属工作区，再决定是否适合三栏展示。
- 修改旧视图名、工作区路由或导航项时，同步更新 README 和 `workspace-routes.ts`。
