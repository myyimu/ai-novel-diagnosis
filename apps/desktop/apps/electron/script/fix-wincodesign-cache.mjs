// electron-builder 解压 winCodeSign 时，里面的 macOS darwin 符号链接在无符号链接权限的
// Windows 上会失败（7za 非零退出）。本脚本把 winCodeSign 缓存里所有 .7z 用「排除 darwin」
// 的方式干净解压（仅 Windows 打包不需要 darwin），让 app-builder 直接复用缓存。
// 无符号链接权限时每次打包前跑一遍；根治办法是开启 Windows「开发者模式」或用管理员终端。
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 定位 7za：在 desktop 工作区的 .pnpm 里找 7zip-bin@<ver>/.../win/x64/7za.exe
function findSevenZip() {
  const desktopRoot = join(__dirname, "..", "..", ".."); // apps/desktop
  const pnpmDir = join(desktopRoot, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    const hit = readdirSync(pnpmDir).find((d) => d.startsWith("7zip-bin@"));
    if (hit) {
      const candidate = join(pnpmDir, hit, "node_modules/7zip-bin/win/x64/7za.exe");
      if (existsSync(candidate)) return candidate;
    }
  }
  // 兜底：直接在 node_modules/7zip-bin
  const fallback = join(desktopRoot, "node_modules/7zip-bin/win/x64/7za.exe");
  if (existsSync(fallback)) return fallback;
  throw new Error("找不到 7za.exe（7zip-bin）");
}

const sevenZip = findSevenZip();

function cacheDir() {
  const localAppData = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "", "AppData", "Local");
  return join(localAppData, "electron-builder", "Cache", "winCodeSign").replace(/\\/g, "/");
}

const dir = cacheDir();
if (!existsSync(dir)) {
  console.log("[fix-wincodesign] no winCodeSign cache dir yet, nothing to do");
  process.exit(0);
}

const archives = readdirSync(dir).filter((f) => f.endsWith(".7z"));
for (const archive of archives) {
  const name = archive.replace(/\.7z$/, "");
  const target = join(dir, name);
  rmSync(target, { recursive: true, force: true });
  const r = spawnSync(sevenZip, ["x", join(dir, archive), `-o${target}`, "-x!darwin", "-y"], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const signtool = join(target, "windows-10/x64/signtool.exe");
  console.log(`${name}: ${r.status === 0 && existsSync(signtool) ? "OK" : "FAILED"}`);
}
console.log("[fix-wincodesign] done");
