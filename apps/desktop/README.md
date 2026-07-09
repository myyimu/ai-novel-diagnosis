# AI网文诊断台 Desktop

`apps/desktop` 是 AI网文诊断台的 Electron 桌面外壳。它不维护独立渲染应用；窗口加载 `apps/web` 的 Next.js 页面。

开发模式下，桌面端默认加载本机 Web 服务。打包模式下，Electron 主进程会先启动内置 API sidecar，再等待 `/health` 通过，随后启动 Next standalone sidecar 并打开窗口。

## 目录结构

```text
apps/desktop/
├── apps/electron/          # Electron 主进程、窗口、IPC、sidecar 编排和打包脚本
├── packages/preload/       # preload API 与 IPC 通道契约
├── package.json            # 桌面工作区命令
└── pnpm-workspace.yaml     # 桌面内部 workspace
```

关键运行时代码：

- `apps/electron/src/services/sidecar-supervisor.ts`: 打包模式下启动 API 与 Web sidecar。
- `apps/electron/src/services/env.ts`: sidecar 环境变量，API 默认 `127.0.0.1:3001`，Web 默认 `127.0.0.1:3000`。
- `apps/electron/script/assemble-sidecars.mjs`: 构建外层 `ai-core`、`api`、`web`，组装 sidecars 和内嵌 Node 运行时。
- `packages/preload/src`: 暴露给页面的 `window.electron` API。

## 本地开发

从仓库根目录启动整个工作区：

```bash
pnpm run dev
```

只启动桌面项目：

```bash
pnpm --filter desktop dev
```

## 打包

```bash
pnpm --filter desktop assemble
pnpm --filter desktop build
pnpm --filter desktop pack
```

`assemble` 会重新构建外层 Web/API/Core 并生成 `apps/desktop/apps/electron/sidecars`。该目录是打包输入，不应手工维护业务逻辑。

## 维护原则

- UI 逻辑放在 `apps/web`，桌面端只负责窗口、IPC、sidecar 生命周期和打包。
- preload 只暴露明确的 IPC 契约，不直接泄露 Node/Electron 能力给页面。
- 打包模式下 API 绑定 loopback 地址，避免桌面 sidecar 暴露到局域网。
