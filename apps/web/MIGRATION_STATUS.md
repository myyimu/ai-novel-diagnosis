# 前端布局迁移状态

本文档只记录当前状态。早期“Phase 1/2/3”“待迁移百分比”等过程清单已经过期，不再作为实施依据。

## 当前信息架构

前端页面按四个工作区组织：

```text
/diagnose
├── /diagnose/quick
├── /diagnose/deep
├── /diagnose/score
└── /diagnose/evidence

/project
├── /project/current
├── /project/revisions
├── /project/methodology
└── /project/export

/research
├── /research/book
├── /research/compare
├── /research/patterns
└── /research/materials

/settings
├── /settings/provider
├── /settings/dashboard
└── /settings/history
```

`/` 默认进入快速诊断。`/critique`、`/book`、`/library`、`/history`、`/export`、`/model` 等旧入口仍保留，用于兼容历史链接。

## 当前布局

- 经典布局仍是默认布局。
- 设置 `NEXT_PUBLIC_USE_THREE_COLUMN_LAYOUT=true` 后启用三栏布局。
- 当前路由通过 `src/lib/workspace-routes.ts` 维护新旧视图名映射。
- 顶层工作区导航由 `src/stores/workspace-nav-store.ts` 和 `src/components/workspace/WorkspaceNav.tsx` 维护。

## 维护原则

- 新页面优先挂到四个工作区下，不再新增旧式一级业务入口。
- 旧路径只做兼容，不作为新的产品导航扩散。
- 修改布局时同步检查 `workspace-routes.ts`、页面目录和 README。
