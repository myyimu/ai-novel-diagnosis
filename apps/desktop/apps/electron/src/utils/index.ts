import { app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SCHEME } from "../constants";

// ESM 下 __dirname 不存在，基于 import.meta.url 重建
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appName = app.getName();

// 工作目录：所有持久化数据（日志、store、缓存）的根 = %APPDATA%/<productName>
export const workspace = path.resolve(app.getPath("userData"));

// 自定义协议名（模板遗留，渲染层已剥离）
export const defaultScheme = DEFAULT_SCHEME;

// 空函数占位
export const noop = () => {};

export { __dirname, __filename };
