import builder from "electron-builder";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootResolve = (r) => resolve(__dirname, "../..", r);
const Platform = builder.Platform;

const nodeEnv = process.env.NODE_ENV;
console.log("当前的环境是： ", nodeEnv);

// 可选：读取 apps/desktop/.env.<NODE_ENV>(.local) 覆盖默认值
const envFile = existsSync(rootResolve(`.env.${nodeEnv}.local`))
  ? rootResolve(`.env.${nodeEnv}.local`)
  : rootResolve(`.env.${nodeEnv}`);
if (existsSync(envFile)) dotenv.config({ path: envFile });

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const options = {
  productName: process.env.APP_NAME || "AI网文诊断台",
  appId: process.env.APP_ID || "com.ai-novel-diagnosis.desktop",
  copyright: process.env.APP_COPYRIGHT || "Copyright © 2026",
  artifactName: "${productName}-setup-${version}.${ext}",
  // 输出到工作区外（临时目录），避免编辑器/工具的文件监视器锁住 win-unpacked 里的 app.asar，
  // 导致 electron-builder 的 EnsureEmptyDir 报“文件被另一进程占用”。
  directories: {
    output:
      process.env.DESKTOP_RELEASE_OUT ||
      join(os.tmpdir(), "ai-novel-desktop-release"),
  },
  // 主进程代码进 asar（保留 build/ 前缀，与 package.json#main 一致）
  files: ["build/**/*", "package.json"],
  // sidecars（node.exe + api + web）必须作为真实磁盘文件放在 asar 外，
  // 否则 node 子进程无法 spawn、Next standalone 无法读取静态文件。
  extraResources: [
    {
      from: "./sidecars",
      to: "sidecars",
      filter: ["**/*"],
    },
  ],
  asar: true,
  win: {
    icon: "../assets/icon.ico",
    // 默认跳过 exe 的 rcedit 改图标/版本步骤：该路径要求 winCodeSign 完整解压（含
    // macOS darwin 符号链接），未开启「开发者模式」/非管理员的 Windows 无法创建符号链接。
    // 设 DESKTOP_SIGN_AND_EDIT=true（需开发者模式或管理员）可启用自定义图标。
    signAndEditExecutable: process.env.DESKTOP_SIGN_AND_EDIT === "true",
    target: [{ target: "nsis", arch: ["x64"] }],
  },
  nsis: {
    oneClick: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "AI网文诊断台",
  },
};

// portable target 当前会停在自解压 wrapper，无法进入主进程；发布只产出 NSIS。
const target =
  process.env.NODE_ENV === "development" ? builder.DIR_TARGET : ["nsis"];

try {
  await builder.build({
    targets: Platform.WINDOWS.createTarget(target),
    config: options,
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
