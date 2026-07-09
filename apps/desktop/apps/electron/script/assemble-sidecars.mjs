// 组装桌面应用的两个 sidecar（API、Next）+ 内嵌 Node 运行时到 apps/electron/sidecars/。
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchNodeRuntime } from "./fetch-node-runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ELECTRON_DIR = resolve(__dirname, ".."); // apps/desktop/apps/electron

// 向上查找外层仓库根（带 one.manifest.json 的目录；内层 desktop 也有 pnpm-workspace.yaml，
// 所以用 one.manifest.json 作为外层标志，避免数 ../ 层数出错）
function findOuterRoot(start) {
  let dir = start;
  let found = null;
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(join(dir, "one.manifest.json"))) found = dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return found || start;
}
const OUTER_ROOT = findOuterRoot(ELECTRON_DIR);

const sidecarsDir = join(ELECTRON_DIR, "sidecars");
const apiSidecar = join(sidecarsDir, "api");
const webSidecar = join(sidecarsDir, "web");
const nodeSidecar = join(sidecarsDir, "node");

function runPnpm(args, { cwd = OUTER_ROOT, extraEnv = {} } = {}) {
  const result = spawnSync("corepack", ["pnpm", ...args], {
    cwd,
    env: {
      ...process.env,
      HUSKY: "0",
      NEXT_TELEMETRY_DISABLED: "1",
      ...extraEnv,
    },
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`corepack pnpm ${args.join(" ")} failed (exit ${result.status})`);
  }
}

// 仅用于目录拷贝（from 必须是目录）
function copyDir(fromAbs, toAbs) {
  if (!existsSync(fromAbs)) {
    throw new Error(`缺失构建产物：${fromAbs}`);
  }
  mkdirSync(toAbs, { recursive: true });
  cpSync(fromAbs, toAbs, { dereference: true, force: true, recursive: true });
}

console.log("[assemble] 清理旧 sidecars");
rmSync(sidecarsDir, { recursive: true, force: true });
mkdirSync(sidecarsDir, { recursive: true });

console.log("[assemble] 构建外层项目（ai-core → api → web）");
runPnpm(["--filter", "@ai-novel-diagnosis/ai-core", "build"]);
runPnpm(["--filter", "api", "build"]);
runPnpm(["--filter", "web", "build"]);

// ── API sidecar：扁平、无 junction 的 node_modules（electron-builder 可安全打包）──
console.log("[assemble] 组装 API sidecar");
mkdirSync(apiSidecar, { recursive: true });

// 1) package.json：剥离 workspace 依赖与脚本（ai-core 单独手工放入）
const apiPkg = JSON.parse(
  readFileSync(join(OUTER_ROOT, "services/api/package.json"), "utf8"),
);
for (const name of Object.keys(apiPkg.dependencies || {})) {
  if (String(apiPkg.dependencies[name]).startsWith("workspace:")) {
    delete apiPkg.dependencies[name];
  }
}
delete apiPkg.scripts;
delete apiPkg.devDependencies;
writeFileSync(join(apiSidecar, "package.json"), JSON.stringify(apiPkg, null, 2));

// 2) 扁平安装运行时依赖（hoisted = npm 式扁平 node_modules，无 junction）
//    --ignore-workspace：避开外层共享 lockfile；--no-frozen-lockfile：全新目录
runPnpm(
  ["install", "--prod", "--ignore-scripts", "--ignore-workspace", "--no-frozen-lockfile"],
  { cwd: apiSidecar, extraEnv: { npm_config_node_linker: "hoisted" } },
);

// 3) 放入 ai-core 构建产物（api 运行时 require 的 workspace 依赖）
const aiCoreDest = join(apiSidecar, "node_modules/@ai-novel-diagnosis/ai-core");
mkdirSync(aiCoreDest, { recursive: true });
copyFileSync(
  join(OUTER_ROOT, "packages/ai-core/package.json"),
  join(aiCoreDest, "package.json"),
);
copyDir(join(OUTER_ROOT, "packages/ai-core/dist"), join(aiCoreDest, "dist"));

// 4) 覆盖 api 自身产物
copyDir(join(OUTER_ROOT, "services/api/dist"), join(apiSidecar, "dist"));
copyDir(join(OUTER_ROOT, "services/api/drizzle/migrations"), join(apiSidecar, "drizzle/migrations"));

// ── Next sidecar：standalone 已自带扁平 node_modules ──
console.log("[assemble] 组装 Next sidecar（standalone + static + public）");
copyDir(join(OUTER_ROOT, "apps/web/.next/standalone"), webSidecar);
copyDir(join(OUTER_ROOT, "apps/web/.next/static"), join(webSidecar, "apps/web/.next/static"));
copyDir(join(OUTER_ROOT, "apps/web/public"), join(webSidecar, "apps/web/public"));

// ── Node 运行时 ──
console.log("[assemble] 拉取内嵌 Node 运行时");
await fetchNodeRuntime(join(nodeSidecar, "node.exe"));

// ── 自检 ──
const mustExist = [
  join(apiSidecar, "dist/main.js"),
  join(apiSidecar, "node_modules/@electric-sql/pglite/dist/index.js"),
  join(apiSidecar, "node_modules/@ai-novel-diagnosis/ai-core/dist/index.cjs"),
  join(webSidecar, "apps/web/server.js"),
  join(webSidecar, "apps/web/.next/static"),
  join(nodeSidecar, "node.exe"),
];
for (const p of mustExist) {
  if (!existsSync(p)) {
    throw new Error(`组装自检失败，缺失：${p}`);
  }
}

console.log("[assemble] sidecars 就绪：", sidecarsDir);
