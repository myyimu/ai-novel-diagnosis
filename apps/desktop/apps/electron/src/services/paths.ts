import { app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM 主进程里定位 sidecar 资源。
// electron-builder 把 apps/desktop/apps/electron/sidecars 作为 extraResources 打进
// <安装目录>/resources/sidecars，运行时用 process.resourcesPath 解析。
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function isPackaged(): boolean {
  return app.isPackaged;
}

// sidecars 根目录
export function sidecarRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "sidecars");
  }
  // dev 模式不 spawn，这里只作兜底（一般不会被调用）
  return path.resolve(__dirname, "..", "..", "sidecars");
}

// 内嵌的 Node 运行时（仅 Windows 打包目标，故 node.exe）
export function nodeExe(): string {
  return path.join(sidecarRoot(), "node", "node.exe");
}

export function apiDir(): string {
  return path.join(sidecarRoot(), "api");
}

// nest build 产物入口
export function apiEntry(): string {
  return path.join(apiDir(), "dist", "main.js");
}

export function webDir(): string {
  return path.join(sidecarRoot(), "web");
}

// Next standalone 入口（相对 webDir 的路径与 web Dockerfile 的 CMD 一致）
export function webEntry(): string {
  return path.join(webDir(), "apps", "web", "server.js");
}
