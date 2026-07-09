// 打包入口：循环「清理 winCodeSign 缓存 → electron-builder 打包」。
// 无符号链接权限时，electron-builder 会在多个子步骤各下载一个 winCodeSign 变体，
// 每个都因 macOS darwin 符号链接失败。每次失败后，上一步下载的新 .7z 会被
// fix-wincodesign-cache 干净解压，下一轮即可复用，最终收敛。
// 根治：开启 Windows「开发者模式」或用管理员终端打包。
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ELECTRON_DIR = dirname(__dirname); // apps/desktop/apps/electron
const RETRY_PATTERNS = ["winCodeSign", "darwin", "symbolic link", "Cannot create symbolic link"];

for (let attempt = 1; attempt <= 6; attempt += 1) {
  console.log(`\n========== package attempt ${attempt}/6 ==========`);

  spawnSync("node", [resolve(__dirname, "fix-wincodesign-cache.mjs")], {
    cwd: ELECTRON_DIR,
    stdio: "inherit",
    env: process.env,
  });

  // cwd 必须是 @app/electron 目录，electron-builder 才能从 node_modules 解析到 electron 版本
  const r = spawnSync("node", [resolve(__dirname, "release.mjs")], {
    cwd: ELECTRON_DIR,
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
    maxBuffer: 1024 * 1024 * 64,
  });
  process.stdout.write(r.stdout?.toString() ?? "");
  process.stderr.write(r.stderr?.toString() ?? "");

  if (r.status === 0) {
    console.log("\n========== package succeeded ==========");
    process.exit(0);
  }

  const combined = `${r.stdout?.toString() ?? ""}${r.stderr?.toString() ?? ""}`;
  const retryable = RETRY_PATTERNS.some((p) => combined.includes(p));
  console.log(`\nrelease exit=${r.status}; retryable=${retryable}`);
  if (!retryable) {
    console.error("遇到非 winCodeSign 类错误，停止重试。");
    process.exit(r.status ?? 1);
  }
}

console.error("\n打包在 6 次尝试后仍失败（winCodeSign）。建议开启 Windows 开发者模式或用管理员终端。");
process.exit(1);
