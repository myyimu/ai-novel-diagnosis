import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FALLBACK_NODE_VERSION = "20.11.0";

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
const OUTER_ROOT = findOuterRoot(__dirname);

function readNodeVersion() {
  try {
    const v = readFileSync(join(OUTER_ROOT, ".nvmrc"), "utf8")
      .trim()
      .replace(/^v/, "");
    return v || FALLBACK_NODE_VERSION;
  } catch {
    return FALLBACK_NODE_VERSION;
  }
}

// 下载与外层 .nvmrc 版本一致的 Node win-x64 二进制，仅提取 node.exe 放到 targetExe。
// 带磁盘缓存，重复打包不重复下载。
export async function fetchNodeRuntime(targetExe) {
  if (existsSync(targetExe)) {
    console.log(`[fetch-node] cached: ${targetExe}`);
    return;
  }

  mkdirSync(dirname(targetExe), { recursive: true });
  const version = readNodeVersion();
  // 国内可设 NODE_DIST_MIRROR=https://npmmirror.com/mirrors/node 加速
  const mirror = (
    process.env.NODE_DIST_MIRROR || "https://nodejs.org/dist"
  ).replace(/\/$/, "");
  const url = `${mirror}/v${version}/node-v${version}-win-x64.zip`;
  const cacheDir = join(__dirname, "..", ".cache", "node-runtime");
  const zipPath = join(cacheDir, `node-v${version}-win-x64.zip`);
  mkdirSync(cacheDir, { recursive: true });

  if (!existsSync(zipPath)) {
    console.log(`[fetch-node] downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`下载 Node 运行时失败：HTTP ${res.status} (${url})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(zipPath, buf);
  } else {
    console.log(`[fetch-node] zip cached: ${zipPath}`);
  }

  // 用 PowerShell 解压（Windows 原生，正确处理 zip 与盘符路径；
  // 避免 Git Bash 的 MSYS tar 把 E:\... 误当成远程主机）
  const extractDir = join(cacheDir, "extract");
  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });
  const ps = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractDir}' -Force`,
    ],
    { stdio: "inherit" },
  );
  if (ps.status !== 0) {
    throw new Error("解压 Node 运行时失败（PowerShell Expand-Archive）");
  }

  const exe = join(extractDir, `node-v${version}-win-x64`, "node.exe");
  if (!existsSync(exe)) {
    throw new Error(`解压后未找到 node.exe：${exe}`);
  }
  renameSync(exe, targetExe);
  console.log(`[fetch-node] placed ${targetExe}`);
}
