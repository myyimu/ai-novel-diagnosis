# 前端重构记录

这份文档保留当前前端重构结论。早期基于单页侧栏、NovelForge 参考和分阶段迁移的计划已经完成或失效，不再作为待办清单。

## 当前结论

- 页面按四个工作区组织：诊断、项目、研究、设置。
- 业务路由优先放在 `/diagnose/*`、`/project/*`、`/research/*`、`/settings/*` 下。
- `/critique`、`/book`、`/library`、`/history`、`/export`、`/model` 等旧路径保留为兼容入口。
- 经典布局是默认布局；设置 `NEXT_PUBLIC_USE_THREE_COLUMN_LAYOUT=true` 可启用三栏布局。
- 三栏布局是展示模式，不再承担独立的信息架构。

## 关键文件

- `src/lib/workspace-routes.ts`: 新旧视图和路由映射。
- `src/stores/workspace-nav-store.ts`: 四工作区导航状态。
- `src/components/workspace/WorkspaceNav.tsx`: 工作区切换 UI。
- `src/components/novel-critique-console.tsx`: 经典/三栏布局切换入口。
- `src/components/workspace/ThreeColumnWorkspaceShell.tsx`: 三栏布局主体。

## 后续维护

- 新增页面时优先补齐 `workspace-routes.ts` 和对应 `app/<workspace>/<view>/page.tsx`。
- 旧一级入口只做兼容，不继续扩展新业务。
- 文档中的页面结构以实际 `src/app` 路由和 `workspace-routes.ts` 为准。
