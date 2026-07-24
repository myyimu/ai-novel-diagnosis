# Web App

`apps/web` 是 AI网文诊断台的 Next.js 前端控制台。

它的产品入口以“按编辑方法诊断，再由作者确认、改稿和复诊”为主：用户粘贴章节后获得问题候选、证据和替代解释，确认取舍并保存修改计划，生成真实 V2 后再独立复诊。进阶能力承接故事体检、成熟样本研究、整书可视化、关系图谱复核和导出资产。产品语义以 [`../../docs/product-doctrine.md`](../../docs/product-doctrine.md) 为准。

## 主要视图

- 诊断工作区：`/diagnose/quick`、`/diagnose/deep`、`/diagnose/score`、`/diagnose/evidence`，覆盖快速诊断、深度质检、评分报告和证据链。
- 项目工作区：`/project/current`、`/project/health`、`/project/revisions`、`/project/methodology`、`/project/export`，覆盖正文版本、作者决定、修改计划、故事体检、复诊、经验证的方法和导出资产。
- 研究工作区：`/research/book`、`/research/compare`、`/research/patterns`、`/research/materials`，覆盖整书拆解、样本对比、套路沉淀和研究资料。
- 设置工作区：`/settings/provider`、`/settings/dashboard`、`/settings/history`，覆盖模型配置、诊断看板和历史任务。

`/` 会进入快速诊断。`/critique`、`/book`、`/library`、`/history`、`/export`、`/model` 等旧路径仍保留为兼容入口。

## 代码结构

```text
src/
├── app/                         # App Router 页面和 API proxy route
├── components/
│   ├── novel-critique-console.tsx
│   ├── ui/                      # 基础 UI 组件
│   └── workspace/               # 工作台拆分视图
├── lib/
│   ├── api-client.ts            # 浏览器/服务端通用 API helper
│   ├── workspace-routes.ts      # 新旧工作区路由映射
│   ├── workspace-analysis-client.ts
│   ├── workspace-cache.ts
│   ├── workspace-progress.ts
│   ├── workspace-view-model.ts
│   └── research-library.ts
└── stores/
    ├── workspace-nav-store.ts   # 四工作区导航状态
    └── workspace-store.ts       # Zustand 本地持久化状态
```

## 本地开发

通常从仓库根目录启动：

```bash
pnpm run dev
```

只启动 Web：

```bash
pnpm --filter web dev
```

默认地址：

```text
http://127.0.0.1:3000
```

如果 Web 和 API 分开部署，配置：

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001/api/v1
API_INTERNAL_BASE_URL=http://127.0.0.1:3001/api/v1
NEXT_PUBLIC_SITE_URL=https://your-public-site.example.com
```

未配置 `NEXT_PUBLIC_API_BASE_URL` 时，前端默认通过 `/api/v1` 走 Next route handler 代理到 API。
`NEXT_PUBLIC_SITE_URL` 用于生成 canonical、`robots.txt`、`sitemap.xml` 和 JSON-LD；生产部署时应设置成真实公开访问地址。

## 常用命令

```bash
pnpm --filter web check
pnpm --filter web test
pnpm --filter web build
```

## 维护原则

- 首屏优先服务新手入口：粘贴章节、查看证据、确认问题、进入真实改稿；完整闭环在项目工作区完成。
- 高级参数默认后置，避免把新手第一步变成配置表单。
- 组件内尽量只保留状态绑定和事件编排；请求、缓存、进度状态机和展示派生逻辑放在 `src/lib`。
- UI 必须把 `quickScore` 标为兼容严重度摘要，把 `confidence` 标为证据/上下文充分度；不得显示成客观质量或准确概率。
- 缓存命中不能创建复诊版本；“已解决”必须来自真实正文变化和复核，不能只改本地展示状态。
