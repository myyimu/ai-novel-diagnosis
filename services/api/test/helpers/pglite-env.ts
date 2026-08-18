import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DrizzleService } from "../../src/service/drizzle/drizzle.service";

// E2E 测试代码直接操作进程环境变量来引导 PGlite —— DrizzleService 属于
// 基础设施层，这里不受业务代码禁用 process.env 的约束（与 ddl.spec.ts
// 同一模式）。调用方必须在 afterEach 里 teardown，防止环境变量泄漏到
// 其他测试文件；配合 --runInBand 使用。
export interface PgliteTestEnv {
  dataDir: string;
  drizzle: DrizzleService;
}

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalPgliteDataDir = process.env.PGLITE_DATA_DIR;

export async function setupPgliteEnv(
  prefix = "ai-novel-e2e-",
): Promise<PgliteTestEnv> {
  delete process.env.DATABASE_URL;
  const dataDir = mkdtempSync(join(tmpdir(), prefix));
  process.env.PGLITE_DATA_DIR = dataDir;
  const drizzle = new DrizzleService();
  await drizzle.onModuleInit();
  return { dataDir, drizzle };
}

export async function teardownPgliteEnv(
  env: PgliteTestEnv | undefined,
): Promise<void> {
  if (env) {
    await env.drizzle.onModuleDestroy();
    rmSync(env.dataDir, { recursive: true, force: true });
  }
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalPgliteDataDir === undefined) {
    delete process.env.PGLITE_DATA_DIR;
  } else {
    process.env.PGLITE_DATA_DIR = originalPgliteDataDir;
  }
}
