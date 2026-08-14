import { mkdirSync } from "fs";
import { join } from "path";
import pino from "pino";

// Default logs directory — will be overridden by initLogger() if called.
let logsDir = join(process.cwd(), "logs");

/**
 * Initialize the logger with configuration from ConfigService.
 * Call once during bootstrap (main.ts) before any logging occurs.
 */
export function initLogger(config?: {
  logsDir?: string;
  isProduction?: boolean;
}): void {
  if (config?.logsDir) {
    logsDir = config.logsDir;
  }
  mkdirSync(logsDir, { recursive: true });
}

// Create directory at module load time for backward compatibility
mkdirSync(logsDir, { recursive: true });

const transport = pino.transport({
  targets: [
    {
      // 控制台输出，使用 pino-pretty 美化
      target: "pino-pretty",
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss o",
        messageFormat: "{level} {msg}",
      },
    },
    {
      // 错误日志 - 按日期切分，保留 30 天
      target: "pino-roll",
      level: "error",
      options: {
        file: join(logsDir, "error", "error"),
        frequency: "daily",
        dateFormat: "yyyy-MM-dd",
        mkdir: true,
        limit: { count: 30 },
      },
    },
    {
      // 警告日志 - 按日期切分，保留 30 天
      target: "pino-roll",
      level: "warn",
      options: {
        file: join(logsDir, "warn", "warn"),
        frequency: "daily",
        dateFormat: "yyyy-MM-dd",
        mkdir: true,
        limit: { count: 30 },
      },
    },
    {
      // 信息日志 - 按日期切分，保留 30 天
      target: "pino-roll",
      level: "info",
      options: {
        file: join(logsDir, "info", "info"),
        frequency: "daily",
        dateFormat: "yyyy-MM-dd",
        mkdir: true,
        limit: { count: 30 },
      },
    },
    {
      // 调试日志 - 按日期切分，保留 7 天
      target: "pino-roll",
      level: "debug",
      options: {
        file: join(logsDir, "debug", "debug"),
        frequency: "daily",
        dateFormat: "yyyy-MM-dd",
        mkdir: true,
        limit: { count: 7 },
      },
    },
  ],
});

/** Whether logger has been initialized with production settings */
let isProductionMode = false;

/**
 * Set the log level. Call from bootstrap after ConfigService is available.
 */
export function setLogLevel(isProduction: boolean): void {
  isProductionMode = isProduction;
}

export const logger = pino(
  {
    get level() {
      return isProductionMode ? "info" : "debug";
    },
  },
  transport,
);

// 导出常用的日志方法
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logInfo = (msg: string, ...args: any[]) =>
  logger.info(msg, ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logError = (msg: string, ...args: any[]) =>
  logger.error(msg, ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logWarn = (msg: string, ...args: any[]) =>
  logger.warn(msg, ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logDebug = (msg: string, ...args: any[]) =>
  logger.debug(msg, ...args);
