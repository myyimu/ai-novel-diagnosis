import path from "node:path";

// 组装两个本地子进程的环境变量。
// 数据目录一律落到 userData（%APPDATA%/<productName>），与启动位置解耦。

export interface ApiEnvOptions {
  userData: string;
  jwtSecret: string;
}

export interface WebEnvOptions {
  webRoot: string;
}

export function buildApiEnv({
  userData,
  jwtSecret,
}: ApiEnvOptions): NodeJS.ProcessEnv {
  const dataDir = path.join(userData, "data");
  // 不设置 NODE_ENV：让 API 走非生产模式，避免 main.ts 的生产 CORS/JWT 强校验
  // （ALLOWED_ORIGINS 与 JWT_SECRET 仍然显式提供，双保险）。
  return {
    ...process.env,
    PORT: "3001",
    HOST: "127.0.0.1",
    DATABASE_URL: "", // 空 → 走内嵌 PGlite，无需外部数据库
    PGLITE_DATA_DIR: path.join(dataDir, "pglite"),
    ANALYSIS_STORAGE_DIR: path.join(dataDir, "uploads"),
    ANALYSIS_ARTIFACT_DIR: path.join(dataDir, "artifacts"),
    LOGS_DIR: path.join(userData, "logs", "api"),
    ALLOWED_ORIGINS: "http://127.0.0.1:3000",
    JWT_SECRET: jwtSecret,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

export function buildWebEnv({ webRoot }: WebEnvOptions): NodeJS.ProcessEnv {
  const standalonePnpmHoist = path.join(
    webRoot,
    "node_modules",
    ".pnpm",
    "node_modules",
  );
  const nodePath = process.env.NODE_PATH
    ? `${standalonePnpmHoist}${path.delimiter}${process.env.NODE_PATH}`
    : standalonePnpmHoist;

  return {
    ...process.env,
    PORT: "3000",
    HOSTNAME: "127.0.0.1",
    NODE_PATH: nodePath,
    // Next 服务把 /api/v1 代理到本地 API
    API_INTERNAL_BASE_URL: "http://127.0.0.1:3001/api/v1",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}
