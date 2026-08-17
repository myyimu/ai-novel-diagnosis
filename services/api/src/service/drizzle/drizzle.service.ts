import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema";
import {
  alterTableAddColumnSql,
  createIndexSql,
  createTableSql,
  listSchemaTables,
} from "./ddl";

const DEFAULT_DATABASE_CONNECT_TIMEOUT_MS = 5_000;

function getDatabaseConnectTimeoutMs() {
  const raw = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return DEFAULT_DATABASE_CONNECT_TIMEOUT_MS;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Database operation timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * DrizzleService picks a driver based on DATABASE_URL.
 *
 * - DATABASE_URL set: connect to real Postgres via pg.Pool.
 * - DATABASE_URL empty: spin up a file-backed PGlite under .local so local
 *   development survives API restarts without requiring Docker.
 *
 * Repositories always read `this.drizzle.db`. The public API is a
 * single field; the dual-driver branching is private.
 */
@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private readonly mode: "postgres" | "pglite";
  private readonly pool?: Pool;
  private pglite?: PGlite;
  private pgliteDataDir?: string;
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    const url = process.env.DATABASE_URL?.trim();
    if (url) {
      this.mode = "postgres";
      this.pool = new Pool({
        connectionString: url,
        connectionTimeoutMillis: getDatabaseConnectTimeoutMs(),
      });
      this.db = drizzleNodePg(this.pool, { schema });
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "DATABASE_URL is required in production; PGlite is only supported for local development.",
        );
      }
      this.mode = "pglite";
      this.pgliteDataDir =
        process.env.PGLITE_DATA_DIR?.trim() ||
        join(process.cwd(), ".local", "pglite");
      mkdirSync(this.pgliteDataDir, { recursive: true });
      this.pglite = new PGlite(this.pgliteDataDir);
      this.db = drizzlePglite(this.pglite, {
        schema,
      }) as unknown as NodePgDatabase<typeof schema>;
      this.logger.warn(
        "DATABASE_URL 未设置，使用本地文件 PGlite 作为开发兜底。" +
          `数据目录：${this.pgliteDataDir}；生产部署请设置 ` +
          "`one env set DATABASE_URL=postgres://... -p <project>`",
      );
    }
  }

  async onModuleInit() {
    if (this.mode === "pglite") {
      try {
        await this.bootstrapPgliteSchema();
      } catch (error) {
        this.logger.warn(
          `PGlite 数据库打开失败（${(error as Error).message}），` +
            "可能是版本升级导致数据格式不兼容。正在备份旧数据并重建……",
        );
        await this.rebuildPglite();
      }
      this.logger.log("PGlite ready");
      return;
    }
    try {
      const client: PoolClient = await withTimeout(
        this.pool!.connect(),
        getDatabaseConnectTimeoutMs(),
      );
      client.release();
      this.logger.log("Database connection established");
    } catch (error) {
      this.logger.error(
        "Failed to connect to database",
        (error as Error).stack,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.mode === "pglite") {
      await this.pglite!.close();
      return;
    }
    await this.pool!.end();
    this.logger.log("Database connection closed");
  }

  async isHealthy(): Promise<boolean> {
    if (this.mode === "pglite") return true;
    try {
      const client: PoolClient = await withTimeout(
        this.pool!.connect(),
        getDatabaseConnectTimeoutMs(),
      );
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  /** isConfigured returns true when a real DATABASE_URL was set. */
  isConfigured(): boolean {
    return this.mode === "postgres";
  }

  async queryRows<T = Record<string, unknown>>(
    queryText: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result =
      this.mode === "postgres"
        ? await this.pool!.query(queryText, params)
        : await this.pglite!.query(queryText, params);
    return this.rowsFromQueryResult(result) as T[];
  }

  /**
   * bootstrapPgliteSchema applies the schema DDL to a local PGlite
   * database. DDL is generated programmatically from schema.ts (see
   * ddl.ts) — the canonical schema is the single source of truth.
   * Real PostgreSQL uses Drizzle migrations (drizzle/migrations).
   */
  private async bootstrapPgliteSchema(): Promise<void> {
    for (const table of listSchemaTables()) {
      await this.db.execute(sql.raw(createTableSql(table)));
    }
    for (const statement of listSchemaTables().flatMap((table) =>
      createIndexSql(table),
    )) {
      await this.db.execute(sql.raw(statement));
    }
    await this.applySchemaDriftMigrations();
  }

  /**
   * applySchemaDriftMigrations aligns an existing local PGlite database
   * with schema.ts: missing columns are added via a generic diff against
   * information_schema, plus a few explicit legacy data fixes. Fresh
   * databases are created verbatim by bootstrap, so the diff is empty.
   */
  private async applySchemaDriftMigrations(): Promise<void> {
    const existingColumns = await this.getExistingColumns();

    for (const table of listSchemaTables()) {
      const config = getTableConfig(table);
      for (const column of config.columns) {
        const columnKey = `${config.name}.${column.name}`;
        if (existingColumns.has(columnKey)) continue;
        this.logger.log(`补齐缺失列：${columnKey}`);
        await this.db.execute(sql.raw(alterTableAddColumnSql(table, column)));
      }
    }

    // 历史修复：早期 DDL 曾把 quick_score 建为 NOT NULL，schema.ts 定义为可空
    await this.db.execute(
      sql.raw(
        'ALTER TABLE "revision_sessions" ALTER COLUMN "quick_score" DROP NOT NULL',
      ),
    );
    // 历史修复：早期数据文件可能存在 NULL 时间戳，回填后再由 NOT NULL 约束接管
    await this.db.execute(
      sql.raw('UPDATE "users" SET "updated" = now() WHERE "updated" IS NULL'),
    );
    await this.db.execute(
      sql.raw(
        'UPDATE "analysis_uploads" SET "created" = COALESCE("created", now()), ' +
          '"updated" = COALESCE("updated", now()) ' +
          'WHERE "created" IS NULL OR "updated" IS NULL',
      ),
    );
  }

  private async getExistingColumns(): Promise<Set<string>> {
    const result = await this.db.execute(
      sql.raw(
        `SELECT "table_name", "column_name" FROM "information_schema"."columns" ` +
          `WHERE "table_schema" = 'public'`,
      ),
    );
    const rows = this.rowsFromQueryResult(result);

    return new Set(
      rows
        .map((row) => {
          if (typeof row !== "object" || row === null) return "";
          const table = "table_name" in row ? String(row.table_name) : "";
          const column = "column_name" in row ? String(row.column_name) : "";
          return table && column ? `${table}.${column}` : "";
        })
        .filter(Boolean),
    );
  }

  private rowsFromQueryResult(result: unknown): unknown[] {
    if (Array.isArray(result)) return result;
    if (
      result &&
      typeof result === "object" &&
      "rows" in result &&
      Array.isArray(result.rows)
    ) {
      return result.rows;
    }
    return [];
  }

  private async rebuildPglite(): Promise<void> {
    const dir = this.pgliteDataDir!;
    try {
      await this.pglite!.close();
    } catch {
      /* already broken — ignore close errors */
    }

    const backupDir = `${dir}-broken-${Date.now()}`;
    renameSync(dir, backupDir);
    this.logger.warn(`旧数据已备份到 ${backupDir}`);

    mkdirSync(dir, { recursive: true });
    this.pglite = new PGlite(dir);
    this.db = drizzlePglite(this.pglite, {
      schema,
    }) as unknown as NodePgDatabase<typeof schema>;

    await this.bootstrapPgliteSchema();
    this.logger.log("已用空白数据库重建 PGlite，旧数据保留在备份目录中");
  }
}
