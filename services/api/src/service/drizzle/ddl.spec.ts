import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { DrizzleService } from "./drizzle.service";
import { createIndexSql, createTableSql, listSchemaTables } from "./ddl";

// 单一数据源验证：PGlite 启动路径的全部 DDL 由 schema.ts 程序化生成，
// 因此引导后的数据库结构必须与 schema 定义逐列一致 —— 任何漂移都会
// 在这里失败，而不是在用户数据上炸出运行时错误。

describe("ddl generator", () => {
  describe("createTableSql", () => {
    it("should render users table with inline unique and defaults", () => {
      const users = findTable("users");
      const ddl = createTableSql(users);

      expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "users"');
      expect(ddl).toContain('"id" text NOT NULL PRIMARY KEY');
      expect(ddl).toContain('"name" varchar(255) NOT NULL UNIQUE');
      expect(ddl).toContain('"created" timestamp (3) DEFAULT now() NOT NULL');
      expect(ddl).toContain('"updated" timestamp (3) NOT NULL');
    });

    it("should render jsonb and scalar defaults on revision_sessions", () => {
      const ddl = createTableSql(findTable("revision_sessions"));

      expect(ddl).toContain('"issue_decisions" jsonb');
      expect(ddl).toContain("DEFAULT '[]'::jsonb NOT NULL");
      expect(ddl).toContain('"retest_status" varchar(32)');
      expect(ddl).toContain("DEFAULT 'not_requested' NOT NULL");
      expect(ddl).toContain('"text_changed" boolean DEFAULT true NOT NULL');
      // schema.ts 中 quick_score 可空 —— 不得出现 NOT NULL
      expect(ddl).toContain('"quick_score" real');
      expect(ddl).not.toContain('"quick_score" real NOT NULL');
    });

    it("should render every declared index as IF NOT EXISTS", () => {
      const statements = listSchemaTables().flatMap((table) =>
        createIndexSql(table),
      );

      expect(statements).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS "story_audit_finding_reviews_unique" ' +
          'ON "story_audit_finding_reviews" ("project_id", "audit_id", "finding_id")',
      );
      expect(statements).toContain(
        'CREATE INDEX IF NOT EXISTS "model_usage_events_job_id_idx" ' +
          'ON "model_usage_events" ("job_id")',
      );
      expect(statements).toContain(
        'CREATE INDEX IF NOT EXISTS "revision_sessions_project_id_idx" ' +
          'ON "revision_sessions" ("project_id")',
      );
      for (const statement of statements) {
        expect(statement).toMatch(/^CREATE (UNIQUE )?INDEX IF NOT EXISTS/);
      }
    });
  });

  describe("bootstrapped PGlite database", () => {
    const originalUrl = process.env.DATABASE_URL;
    const originalPgliteDataDir = process.env.PGLITE_DATA_DIR;
    let tempPgliteDataDir: string | undefined;
    let drizzle: DrizzleService | undefined;

    beforeEach(async () => {
      delete process.env.DATABASE_URL;
      tempPgliteDataDir = mkdtempSync(join(tmpdir(), "ai-novel-ddl-"));
      process.env.PGLITE_DATA_DIR = tempPgliteDataDir;
      drizzle = new DrizzleService();
      await drizzle.onModuleInit();
    });

    afterEach(async () => {
      if (drizzle) {
        await drizzle.onModuleDestroy();
        drizzle = undefined;
      }
      if (originalUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalUrl;
      }
      if (originalPgliteDataDir === undefined) {
        delete process.env.PGLITE_DATA_DIR;
      } else {
        process.env.PGLITE_DATA_DIR = originalPgliteDataDir;
      }
      if (tempPgliteDataDir) {
        rmSync(tempPgliteDataDir, { recursive: true, force: true });
        tempPgliteDataDir = undefined;
      }
    });

    it("should create every schema.ts table and column after bootstrap", async () => {
      const columns = await drizzle!.queryRows<{
        table_name: string;
        column_name: string;
        is_nullable: string;
      }>(
        `SELECT "table_name", "column_name", "is_nullable"
         FROM "information_schema"."columns"
         WHERE "table_schema" = 'public'`,
      );
      const columnByTable = new Map(
        columns.map((row) => [`${row.table_name}.${row.column_name}`, row]),
      );

      const tables = listSchemaTables();
      expect(tables.length).toBeGreaterThanOrEqual(8);

      for (const table of tables) {
        const config = getTableConfig(table);
        for (const column of config.columns) {
          const key = `${config.name}.${column.name}`;
          const actual = columnByTable.get(key);
          expect(actual).toBeDefined();
          // $defaultFn 属于客户端默认值，不影响列的可空性
          const expectNullable = !column.notNull;
          expect(actual?.is_nullable).toBe(expectNullable ? "YES" : "NO");
        }
      }
    });

    it("should create every declared index in the database", async () => {
      const indexes = await drizzle!.queryRows<{ indexname: string }>(
        `SELECT "indexname" FROM "pg_indexes" WHERE "schemaname" = 'public'`,
      );
      const indexNames = new Set(indexes.map((row) => row.indexname));

      for (const table of listSchemaTables()) {
        for (const index of getTableConfig(table).indexes) {
          expect(index.config.name).toBeDefined();
          expect(indexNames.has(index.config.name!)).toBe(true);
        }
      }
    });

    it("should upgrade a legacy database to the current schema", async () => {
      // 模拟旧版本手写 DDL 建出的库：quick_score NOT NULL、缺新列
      await drizzle!.onModuleDestroy();
      const legacyPglite = new PGlite(tempPgliteDataDir);
      await legacyPglite.exec(`
        ALTER TABLE "revision_sessions" ALTER COLUMN "quick_score" SET NOT NULL;
        ALTER TABLE "revision_sessions" DROP COLUMN "story_audit_finding_ids";
        ALTER TABLE "revision_sessions" DROP COLUMN "revision_note";
      `);
      await legacyPglite.close();

      drizzle = new DrizzleService();
      await drizzle.onModuleInit();

      const columns = await drizzle!.queryRows<{
        column_name: string;
        is_nullable: string;
      }>(
        `SELECT "column_name", "is_nullable" FROM "information_schema"."columns"
         WHERE "table_schema" = 'public' AND "table_name" = 'revision_sessions'`,
      );
      const columnByName = new Map(
        columns.map((row) => [row.column_name, row]),
      );

      // 缺失列被通用 diff 补齐
      expect(columnByName.has("story_audit_finding_ids")).toBe(true);
      expect(columnByName.has("revision_note")).toBe(true);
      // 旧库的 quick_score NOT NULL 被显式历史修复放宽
      expect(columnByName.get("quick_score")?.is_nullable).toBe("YES");

      // 新索引在旧库上也会创建
      const indexes = await drizzle!.queryRows<{ indexname: string }>(
        `SELECT "indexname" FROM "pg_indexes" WHERE "schemaname" = 'public'`,
      );
      expect(
        indexes.some((row) => row.indexname === "revision_sessions_project_id_idx"),
      ).toBe(true);
    });
  });
});

function findTable(name: string): PgTable {
  const table = listSchemaTables().find(
    (candidate) => getTableConfig(candidate).name === name,
  );
  if (!table) {
    throw new Error(`schema.ts 中找不到表：${name}`);
  }
  return table;
}
