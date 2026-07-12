# 服务启动说明

Last updated: 2026-07-10

本文档说明 AI网文诊断台在不同场景下的启动方式：Windows exe、Windows 本地脚本、macOS/Linux 开发环境、Docker Compose，以及桌面端打包。

## 先选启动方式

| 场景 | 推荐入口 | 适合对象 |
| --- | --- | --- |
| Windows 普通试用 | `scripts/start-local.cmd` | 不想手动配环境的用户 |
| Windows 桌面 exe | 发布产物里的安装包 | 想像普通桌面软件一样使用的用户 |
| macOS 普通试用 | `scripts/start-local-mac.command` | 不想手动配环境的用户 |
| macOS / Linux 本地开发 | `pnpm run dev` 或 `pnpm run dev:raw` | 开发者 |
| Docker / Linux 服务器演示 | `docker compose up --build` | 已安装 Docker 的部署或演示环境 |
| 单独调试 Web / API / Core | `pnpm run dev:*` 或 `pnpm run dev:*:raw` | 需要定位单个服务问题的开发者 |

默认本地地址：

```text
Web: http://127.0.0.1:3000
API: http://127.0.0.1:3001/api/v1
Health: http://127.0.0.1:3001/health
```

## 基础环境

仓库声明的版本策略：

```text
Node.js: >=20.11.0 <21
pnpm: >=10.14.0 <11
packageManager: pnpm@10.14.0
```

推荐通过 Corepack 固定 pnpm 版本：

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm install
```

如果本机已有更新的全局 pnpm，但被 `package.json#engines` 拦截，请优先使用上面的 Corepack 命令，而不是修改项目版本要求。

## Windows：一键脚本启动

最简单入口：

```powershell
scripts/start-local.cmd
```

自动安装模式：

```powershell
scripts/start-local.cmd -a
scripts/start-local.cmd --auto-install
```

从工作区脚本启动：

```powershell
pnpm run start:local
```

常用参数：

```powershell
pnpm run start:local -- -NoBrowser
pnpm run start:local -- -Reuse
pnpm run start:local -- -WebPort 3100 -ApiPort 3101
pnpm run start:local -- -PortSearchLimit 30
scripts/reset-local.cmd
```

参数说明：

- `-NoBrowser`: 只启动服务，不自动打开浏览器。
- `-Reuse`: 复用健康的本项目 API/Web 服务，而不是重启。
- `-WebPort`: Web 优先端口，默认 `3000`。
- `-ApiPort`: API 优先端口，默认 `3001`。
- `-PortSearchLimit`: 首选端口之后继续尝试的范围，默认 `20`。
- `scripts/reset-local.cmd`: 重置本地 PGlite 运行目录后重新启动。

脚本会做这些事：

1. 检查 Node.js 和 pnpm 版本。
2. 缺依赖时执行 `pnpm install`。
3. 处理 Windows 下依赖链接权限不足的问题，必要时提示或拉起管理员 PowerShell。
4. 默认关闭旧的本项目 API/Web 进程并重启。
5. 默认端口被其他程序占用时，搜索附近可用端口。
6. 分别打开 API 和 Web 的 PowerShell 窗口。
7. 将运行日志写入 `.local/run-logs`。

停止方式：关闭脚本打开的 API/Web PowerShell 窗口即可。

## Windows：exe 启动

桌面端发布产物目前面向 Windows x64，打包脚本会生成 NSIS 安装包：

- NSIS 安装包：`AI网文诊断台-setup-<version>.exe`

普通用户使用方式：

1. 下载发布产物。
2. 双击安装包。
3. 等待窗口打开；桌面端会在本机回环地址启动内置 API sidecar 和 Next sidecar。

打包模式不要求用户单独打开浏览器或手动启动 API/Web。API 默认只绑定本机 loopback 地址，避免 sidecar 暴露到局域网。

说明：`portable` 自解压目标曾出现只停留在 wrapper 进程、没有进入 Electron 主进程的问题，因此当前 release 不再发布 portable exe。开发者需要排查打包内容时，可运行 release 目录下的 `win-unpacked\AI网文诊断台.exe`。

开发者本地构建 Windows exe：

```powershell
pnpm --filter desktop release
```

这个命令会先执行：

```text
desktop assemble -> desktop build -> @app/electron package
```

`assemble` 会构建并组装：

- `packages/ai-core`
- `services/api`
- `apps/web`
- 内嵌 Node 运行时
- Electron sidecars

默认输出目录由桌面打包脚本控制，当前是系统临时目录下的 `ai-novel-desktop-release`。如需固定输出目录，可在 PowerShell 中指定：

```powershell
$env:DESKTOP_RELEASE_OUT="E:\ai-novel-diagnosis\.local\desktop-release"
pnpm --filter desktop release
```

如果打包时遇到 `winCodeSign`、`darwin`、`symbolic link` 相关错误，优先开启 Windows「开发者模式」或使用管理员终端重新执行打包命令。

## macOS：一键脚本启动

最简单入口，适合双击：

```bash
scripts/start-local-mac.command
```

从终端启动：

```bash
scripts/start-local-mac.sh
scripts/start-local-mac.sh --auto-install
pnpm run start:local:mac
```

常用参数：

```bash
pnpm run start:local:mac -- --no-browser
pnpm run start:local:mac -- --reuse
pnpm run start:local:mac -- --web-port 3100 --api-port 3101
pnpm run start:local:mac -- --port-search-limit 30
```

参数说明：

- `--no-browser`: 只启动服务，不自动打开浏览器。
- `--reuse`: 复用健康的本项目 API/Web 服务。
- `--web-port`: Web 优先端口，默认 `3000`。
- `--api-port`: API 优先端口，默认 `3001`。
- `--port-search-limit`: 首选端口之后继续尝试的范围，默认 `20`。
- `--auto-install`: 缺依赖时直接执行 `pnpm install`，不再询问。
- `--reset-pglite`: 重置本地 PGlite 运行目录后重新启动。

脚本会做这些事：

1. 检查 Node.js 版本；低于 `20.11.0` 会阻断，`21+` 会提示超出声明范围但继续启动。
2. 优先通过 Corepack 激活 `pnpm@10.14.0`。
3. 缺依赖时提示执行 `pnpm install`，或在 `--auto-install` 下自动安装。
4. 搜索可用 API / Web 端口。
5. 在同一个 Terminal 窗口后台启动 API 和 Web。
6. 自动设置 `NEXT_PUBLIC_API_BASE_URL`、`API_INTERNAL_BASE_URL`、`PGLITE_DATA_DIR`。
7. 将运行日志写入 `.local/run-logs`。
8. 默认打开 Web 页面。

停止方式：在启动脚本所在 Terminal 窗口按 `Ctrl+C`。

## macOS：开发命令

如果你只想用开发命令，也可以从仓库根目录启动。

安装环境和依赖：

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm install
```

使用 One CLI 启动整个工作区：

```bash
pnpm run dev:dry-run
pnpm run dev
```

如果本机没有 `one` 命令，使用不依赖 One CLI 的 raw 启动：

```bash
pnpm run dev:raw
```

单独启动服务：

```bash
pnpm run dev:web:raw
pnpm run dev:api:raw
pnpm run dev:core:raw
```

停止方式：在对应终端按 `Ctrl+C`。

说明：当前 Electron release 脚本显式构建 Windows 目标。macOS 桌面安装包还没有在脚本中声明和验证；macOS 用户建议先使用浏览器访问本地 Web 服务。

## Linux：本地启动

Linux 本地开发和 macOS 类似，推荐从仓库根目录执行：

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm install
pnpm run dev
```

没有 One CLI 时：

```bash
pnpm run dev:raw
```

单独启动服务：

```bash
pnpm run dev:web:raw
pnpm run dev:api:raw
pnpm run dev:core:raw
```

停止方式：在对应终端按 `Ctrl+C`。

如果用于服务器演示或需要更接近部署形态，优先使用 Docker Compose。

## Docker Compose 启动

适合已安装 Docker Desktop / Docker Engine 的本地部署、Linux 服务器演示或依赖隔离场景。

```bash
cp .env.example .env
docker compose up --build
```

默认暴露：

```text
Web: http://localhost:3000
API: http://localhost:3001/api/v1
Health: http://localhost:3001/health
PostgreSQL: localhost:5432
```

停止服务：

```bash
docker compose down
```

同时删除 PostgreSQL 数据卷：

```bash
docker compose down -v
```

Docker Compose 会启动：

- `postgres`: PostgreSQL 16。
- `api`: NestJS API。
- `web`: Next.js Web。

常用端口和环境变量可在 `.env` 中覆盖：

```text
WEB_PORT=3000
API_PORT=3001
POSTGRES_PORT=5432
POSTGRES_USER=novel
POSTGRES_PASSWORD=novel
POSTGRES_DB=ai_novel_first_step
NEXT_PUBLIC_API_BASE_URL=/api/v1
API_INTERNAL_BASE_URL=http://api:3001/api/v1
```

## 桌面端开发模式

桌面端开发模式用于调试 Electron 外壳、IPC 和 sidecar 编排逻辑。它默认加载本机 Web 服务。

先启动 Web/API/Core：

```bash
pnpm run dev:raw
```

另开终端启动桌面端：

```bash
pnpm --filter desktop dev
```

打包前组装 sidecars：

```bash
pnpm --filter desktop assemble
```

仅构建桌面代码：

```bash
pnpm --filter desktop build
```

开发目录打包：

```bash
pnpm --filter desktop pack
```

发布打包：

```bash
pnpm --filter desktop release
```

## 常用服务命令

One CLI 入口：

```bash
pnpm run dev
pnpm run dev:web
pnpm run dev:api
pnpm run dev:core
```

不依赖 One CLI 的入口：

```bash
pnpm run dev:raw
pnpm run dev:web:raw
pnpm run dev:api:raw
pnpm run dev:core:raw
```

启动后打开页面请访问 Web 地址：`http://127.0.0.1:3000`。`http://127.0.0.1:3001` 是 API 根路径，浏览器直接打开可能会显示 `Cannot GET /`；检查 API 是否正常请访问 `http://127.0.0.1:3001/health`，查看 API 信息请访问 `http://127.0.0.1:3001/api/v1`。

质量检查：

```bash
pnpm run check
pnpm run test
pnpm run build
pnpm run ci
```

## 本地数据目录

本地开发默认数据和日志目录：

```text
.local/pglite
.local/pglite-runtime
.local/analysis
.local/artifacts
.local/run-logs
```

这些目录已被 `.gitignore` 忽略，不应提交上传文本、模型输出、本地数据库、日志或 API Key。

## 常见问题

### `pnpm` 版本不符合要求

执行：

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm --version
```

确认输出在 `>=10.14.0 <11` 范围内。

### `nest` 或 `next` 命令找不到

通常是依赖未安装或安装不完整。先在仓库根目录执行：

```bash
pnpm install
```

Windows 用户也可以直接执行：

```powershell
scripts/start-local.cmd -a
```

### 默认端口被占用

Windows 一键脚本会自动搜索附近端口，也可以手动指定：

```powershell
pnpm run start:local -- -WebPort 3100 -ApiPort 3101
```

Docker Compose 可在 `.env` 中修改：

```text
WEB_PORT=3100
API_PORT=3101
POSTGRES_PORT=15432
```

### API 健康检查

浏览器或终端访问：

```text
http://127.0.0.1:3001/health
```

Docker 内部健康检查也使用 `/health` 判断 API 是否就绪。

## 相关文件

- `scripts/start-local.cmd`
- `scripts/start-local.ps1`
- `scripts/reset-local.cmd`
- `scripts/check-env.ps1`
- `apps/desktop/README.md`
- `apps/desktop/apps/electron/script/assemble-sidecars.mjs`
- `apps/desktop/apps/electron/script/release.mjs`
- `docker-compose.yml`
- `.nvmrc`
- `package.json`
