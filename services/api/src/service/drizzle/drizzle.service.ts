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
import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema";

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
      await this.applyDatabaseCompatibilityMigrations();
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
   * database. Real PostgreSQL uses Drizzle migrations; keep this local
   * fallback DDL in sync with `schema.ts` and `drizzle/migrations`.
   */
  private async bootstrapPgliteSchema(): Promise<void> {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY,
        "name" varchar(255) NOT NULL UNIQUE,
        "created" timestamp(3) DEFAULT now() NOT NULL,
        "updated" timestamp(3) NOT NULL
      )
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "analysis_uploads" (
        "id" text PRIMARY KEY,
        "title" varchar(255) NOT NULL,
        "genre" varchar(64) NOT NULL,
        "original_filename" varchar(255) NOT NULL,
        "raw_text_path" text NOT NULL,
        "normalized_text_path" text NOT NULL,
        "raw_length" integer NOT NULL,
        "cleaned_length" integer NOT NULL,
        "chapter_count" integer NOT NULL,
        "preprocessing" jsonb NOT NULL,
        "created" timestamp(3) DEFAULT now() NOT NULL,
        "updated" timestamp(3) NOT NULL
      )
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "book_analysis_jobs" (
        "id" text PRIMARY KEY,
        "upload_id" text,
        "type" varchar(64) NOT NULL,
        "status" varchar(32) NOT NULL,
        "input_summary" jsonb NOT NULL,
        "progress" jsonb NOT NULL,
        "preprocessing" jsonb,
        "partial_result" jsonb,
        "result" jsonb,
        "error" text,
        "created_at" timestamp(3) DEFAULT now() NOT NULL,
        "updated_at" timestamp(3) NOT NULL,
        "started_at" timestamp(3),
        "finished_at" timestamp(3)
      )
    `);
    await this.db.execute(sql`
      ALTER TABLE "book_analysis_jobs"
      ADD COLUMN IF NOT EXISTS "partial_result" jsonb
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "workspace_projects" (
        "id" text PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "created_at" timestamp(3) DEFAULT now() NOT NULL,
        "updated_at" timestamp(3) NOT NULL
      )
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "revision_sessions" (
        "id" text PRIMARY KEY,
        "project_id" text NOT NULL,
        "created_at" timestamp(3) DEFAULT now() NOT NULL,
        "updated_at" timestamp(3) NOT NULL,
        "chapter_title" text NOT NULL,
        "genre" varchar(64) NOT NULL,
        "input_kind" varchar(64) NOT NULL,
        "text_hash" text NOT NULL,
        "text_length" integer NOT NULL,
        "quick_score" real NOT NULL,
        "gate_decision" varchar(32) NOT NULL,
        "main_problem" text NOT NULL,
        "issue_titles" jsonb NOT NULL,
        "issue_categories" jsonb NOT NULL,
        "next_prompt" text,
        "revision_note" text,
        "revision_note_updated_at" timestamp(3),
        "methodology_card_ids" jsonb NOT NULL
      )
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "methodology_cards" (
        "project_card_id" text PRIMARY KEY,
        "project_id" text NOT NULL,
        "id" text NOT NULL,
        "source_issue_id" text NOT NULL,
        "type" varchar(64) NOT NULL,
        "title" text NOT NULL,
        "trigger_problem" text NOT NULL,
        "reusable_rule" text NOT NULL,
        "self_check_question" text NOT NULL,
        "prompt_template" text,
        "first_seen_at" timestamp(3) NOT NULL,
        "last_seen_at" timestamp(3) NOT NULL,
        "source_chapter_title" text NOT NULL,
        "source_issue_title" text,
        "occurrence_count" integer NOT NULL,
        "usage_count" integer NOT NULL
      )
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "model_usage_events" (
        "id" text PRIMARY KEY,
        "job_id" text,
        "stage" varchar(64),
        "component" varchar(64),
        "request_kind" varchar(64),
        "provider" varchar(64) NOT NULL,
        "preset" varchar(64) NOT NULL,
        "model" varchar(128) NOT NULL,
        "prompt_tokens" integer NOT NULL,
        "completion_tokens" integer NOT NULL,
        "total_tokens" integer NOT NULL,
        "request_ms" integer NOT NULL,
        "estimated" boolean NOT NULL,
        "success" boolean NOT NULL,
        "error" text,
        "metadata" jsonb NOT NULL,
        "created_at" timestamp(3) DEFAULT now() NOT NULL
      )
    `);
    await this.db.execute(sql`
      CREATE INDEX IF NOT EXISTS "model_usage_events_job_id_idx"
      ON "model_usage_events" ("job_id")
    `);
    await this.applyDatabaseCompatibilityMigrations();
  }

  private async applyDatabaseCompatibilityMigrations(): Promise<void> {
    const tables = await this.getExistingTables();

    if (tables.has("users")) {
      await this.db.execute(sql`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "created" timestamp(3) DEFAULT now() NOT NULL
      `);
      await this.db.execute(sql`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "updated" timestamp(3) DEFAULT now() NOT NULL
      `);
      await this.db.execute(sql`
        UPDATE "users"
        SET "updated" = now()
        WHERE "updated" IS NULL
      `);
    }

    if (tables.has("analysis_uploads")) {
      await this.db.execute(sql`
        ALTER TABLE "analysis_uploads"
        ADD COLUMN IF NOT EXISTS "created" timestamp(3) DEFAULT now() NOT NULL
      `);
      await this.db.execute(sql`
        ALTER TABLE "analysis_uploads"
        ADD COLUMN IF NOT EXISTS "updated" timestamp(3) DEFAULT now() NOT NULL
      `);
      await this.db.execute(sql`
        UPDATE "analysis_uploads"
        SET "created" = COALESCE("created", now()),
            "updated" = COALESCE("updated", now())
        WHERE "created" IS NULL OR "updated" IS NULL
      `);
    }

    if (tables.has("book_analysis_jobs")) {
      await this.db.execute(sql`
        ALTER TABLE "book_analysis_jobs"
        ADD COLUMN IF NOT EXISTS "partial_result" jsonb
      `);
    }

    if (tables.has("workspace_projects")) {
      await this.db.execute(sql`
        ALTER TABLE "workspace_projects"
        ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) DEFAULT now() NOT NULL
      `);
      await this.db.execute(sql`
        ALTER TABLE "workspace_projects"
        ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) DEFAULT now() NOT NULL
      `);
    }

    if (tables.has("revision_sessions")) {
      await this.db.execute(sql`
        ALTER TABLE "revision_sessions"
        ADD COLUMN IF NOT EXISTS "revision_note" text
      `);
      await this.db.execute(sql`
        ALTER TABLE "revision_sessions"
        ADD COLUMN IF NOT EXISTS "revision_note_updated_at" timestamp(3)
      `);
    }

    if (tables.has("model_usage_events")) {
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "job_id" text
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "stage" varchar(64)
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "component" varchar(64)
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "request_kind" varchar(64)
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "provider" varchar(64)
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "preset" varchar(64)
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "model" varchar(128)
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "prompt_tokens" integer
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "completion_tokens" integer
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "total_tokens" integer
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "request_ms" integer
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "estimated" boolean
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "success" boolean
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "error" text
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "metadata" jsonb
      `);
      await this.db.execute(sql`
        ALTER TABLE "model_usage_events"
        ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) DEFAULT now() NOT NULL
      `);
    } else {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "model_usage_events" (
          "id" text PRIMARY KEY,
          "job_id" text,
          "stage" varchar(64),
          "component" varchar(64),
          "request_kind" varchar(64),
          "provider" varchar(64) NOT NULL,
          "preset" varchar(64) NOT NULL,
          "model" varchar(128) NOT NULL,
          "prompt_tokens" integer NOT NULL,
          "completion_tokens" integer NOT NULL,
          "total_tokens" integer NOT NULL,
          "request_ms" integer NOT NULL,
          "estimated" boolean NOT NULL,
          "success" boolean NOT NULL,
          "error" text,
          "metadata" jsonb NOT NULL,
          "created_at" timestamp(3) DEFAULT now() NOT NULL
        )
      `);
    }

    await this.db.execute(sql`
      CREATE INDEX IF NOT EXISTS "model_usage_events_job_id_idx"
      ON "model_usage_events" ("job_id")
    `);
  }

  private async getExistingTables(): Promise<Set<string>> {
    const result = await this.db.execute(sql`
      SELECT "table_name"
      FROM "information_schema"."tables"
      WHERE "table_schema" = 'public'
    `);
    const rows = this.rowsFromQueryResult(result);

    return new Set(
      rows
        .map((row) =>
          typeof row === "object" && row !== null && "table_name" in row
            ? String(row.table_name)
            : "",
        )
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
