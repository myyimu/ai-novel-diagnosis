// 配置加载策略（One CLI 推荐）：
//  1. 用 @nestjs/config 的 registerAs 把 process.env.* 映射成嵌套
//     namespace（jwt / server / database / app），ConfigService 消费。
//  2. 通过 `one env set <KEY>=<value>` 设置的 secret 会在 `one run` /
//     `one dev` 启动时被自动注入为环境变量，无须额外文件渲染。
//
//     one env set DATABASE_URL=postgres://prod/db -p api-nest
//     one env set JWT_SECRET=real-secret           -p api-nest
//
//     ConfigService 里：
//       config.get('database.url')  ←  process.env.DATABASE_URL
//       config.get('jwt.secret')    ←  process.env.JWT_SECRET
//
//  3. 默认值在下方各 registerAs 工厂里兜底；生产环境缺关键 secret
//     仍直接抛错（NODE_ENV=production），非生产环境则生成一次性随机
//     fallback 以便首跑即可启动。
//
// 因此**不要**用模板渲染 / 文件生成方式补 config，运行时 env 已经覆盖。
import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const configLogger = new Logger("Config");

export const jwtConfig = registerAs("jwt", () => {
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is required in production",
      );
    }
    secret = randomBytes(32).toString("hex");
    configLogger.warn(
      "JWT_SECRET 未设置；已生成一次性随机 secret（每次启动都会变，仅用于本地开发）。" +
        " 跑 `one env set JWT_SECRET=<value>` 设置稳定值。",
    );
  }
  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  };
});

export const serverConfig = registerAs("server", () => ({
  port: parseInt(process.env.PORT || "3001", 10),
  // Desktop sidecars stay on loopback. Container deployments must explicitly
  // opt into 0.0.0.0 so the Web container can reach the API over its private
  // Docker network.
  host: process.env.HOST?.trim() || "127.0.0.1",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
}));

export const databaseConfig = registerAs("database", () => ({
  url: process.env.DATABASE_URL,
}));

export const appConfig = registerAs("app", () => ({
  responseInterceptorExcludePaths: [
    "stream",
    "yungouos/callback",
    "/metrics",
    "/health",
  ],
  authGuardExcludePaths: ["/metrics", "/health"],
  // When set, getAccessToken() requires callers to provide this exact value.
  // Unset (undefined) means any code is accepted — suitable for local-only dev.
  accessToken: process.env.APP_ACCESS_TOKEN?.trim() || undefined,
  version: process.env.npm_package_version || "0.1.0",
}));

/** Global rate-limit configuration (@nestjs/throttler) */
export const throttlerConfig = registerAs("throttler", () => ({
  // Time window in milliseconds (default: 60s)
  ttlMs: parseInt(process.env.THROTTLE_TTL || "60000", 10),
  // Max requests per window per client. 120/min is generous enough for a
  // single-user local app while still blunting brute force and LLM cost abuse.
  limit: parseInt(process.env.THROTTLE_LIMIT || "120", 10),
}));

/** AI model provider configuration */
export const providerConfig = registerAs("provider", () => ({
  requestTimeoutMs: parseInt(
    process.env.PROVIDER_REQUEST_TIMEOUT_MS || "120000",
    10,
  ),
  lengthRetryMaxOutputTokens: parseInt(
    process.env.PROVIDER_LENGTH_RETRY_MAX_OUTPUT_TOKENS || "16384",
    10,
  ),
  sharedGpu: {
    baseUrl: process.env.SHARED_GPU_BASE_URL?.trim() || null,
    apiKey: process.env.SHARED_GPU_API_KEY?.trim() || null,
    model: process.env.SHARED_GPU_MODEL?.trim() || null,
    jsonMode: process.env.SHARED_GPU_JSON_MODE === "true",
  },
  // AI Horde 匿名池 key（官方公开文档值，非机密）。提取为配置项
  // 便于部署时替换为注册用户 key 以获得更高优先级。
  sharedGpuAnonymousApiKey:
    process.env.SHARED_GPU_ANONYMOUS_API_KEY?.trim() || "0000000000",
  enableOpenaiCompatJsonSchema:
    process.env.ENABLE_OPENAI_COMPAT_JSON_SCHEMA === "true",
}));

/** Logging configuration */
export const loggingConfig = registerAs("logging", () => ({
  logsDir: process.env.LOGS_DIR?.trim() || join(process.cwd(), "logs"),
}));

/** Drizzle/infrastructure configuration */
export const drizzleConfig = registerAs("drizzle", () => ({
  connectTimeoutMs: parseInt(
    process.env.DATABASE_CONNECT_TIMEOUT_MS || "10000",
    10,
  ),
  migrationsFolder:
    process.env.DRIZZLE_MIGRATIONS_FOLDER || "./drizzle/migrations",
  pgliteDataDir: process.env.PGLITE_DATA_DIR?.trim(),
}));

export const analysisConfig = registerAs("analysis", () => ({
  // Local-first storage root for analysis uploads (snapshots, raw/normalized text).
  storageDir:
    process.env.ANALYSIS_STORAGE_DIR?.trim() ||
    join(process.cwd(), ".local", "analysis"),
  // Local-first storage root for async book-analysis job artifacts (chapter map files).
  artifactDir:
    process.env.ANALYSIS_ARTIFACT_DIR?.trim() ||
    join(process.cwd(), ".local", "artifacts"),
  // Optional symmetric key for AES-256-GCM encryption of upload artifacts.
  // When unset, uploads are stored as plaintext (local-only dev mode).
  storageKey: process.env.ANALYSIS_STORAGE_KEY?.trim() || undefined,
  // Whole-book jobs are expensive. Four concurrent jobs keep local batch
  // analysis responsive while the hard cap protects model and memory usage.
  bookJobConcurrency: Math.max(
    1,
    Math.min(4, Number(process.env.BOOK_JOB_CONCURRENCY) || 4),
  ),
  // Keep a single-user installation from silently accumulating manuscripts and
  // model artifacts forever. Both values can be raised explicitly for a
  // deliberate local archive.
  retentionDays: Math.max(1, Number(process.env.ANALYSIS_RETENTION_DAYS) || 30),
  storageMaxBytes:
    Math.max(64, Number(process.env.ANALYSIS_STORAGE_MAX_MB) || 512) *
    1024 *
    1024,
  artifactMaxBytes:
    Math.max(64, Number(process.env.ANALYSIS_ARTIFACT_MAX_MB) || 512) *
    1024 *
    1024,
}));
