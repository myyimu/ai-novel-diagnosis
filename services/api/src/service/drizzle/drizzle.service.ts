import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

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
  private readonly pglite?: PGlite;
  public readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    const url = process.env.DATABASE_URL?.trim();
    if (url) {
      this.mode = "postgres";
      this.pool = new Pool({ connectionString: url });
      this.db = drizzleNodePg(this.pool, { schema });
    } else {
      this.mode = "pglite";
      const dataDir =
        process.env.PGLITE_DATA_DIR?.trim() ||
        join(process.cwd(), ".local", "pglite");
      mkdirSync(dataDir, { recursive: true });
      this.pglite = new PGlite(dataDir);
      // PgliteDatabase shares the query-builder API with NodePgDatabase;
      // we cast so repositories type-check against a single shape.
      this.db = drizzlePglite(this.pglite, {
        schema,
      }) as unknown as NodePgDatabase<typeof schema>;
      this.logger.warn(
        "DATABASE_URL 未设置，使用本地文件 PGlite 作为开发兜底。" +
          `数据目录：${dataDir}；生产部署请设置 ` +
          "`one env set DATABASE_URL=postgres://... -p <project>`",
      );
    }
  }

  async onModuleInit() {
    if (this.mode === "pglite") {
      await this.bootstrapPgliteSchema();
      this.logger.log("PGlite (in-memory) ready");
      return;
    }
    try {
      const client = await this.pool!.connect();
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
      const client = await this.pool!.connect();
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

  /**
   * bootstrapPgliteSchema applies the schema DDL to a fresh in-memory
   * PGlite instance. We hand-write the DDL here because drizzle-kit
   * migrations aren't generated for this template. Keep this block in
   * sync with `schema.ts` whenever you add a table.
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
        "result" jsonb,
        "error" text,
        "created_at" timestamp(3) DEFAULT now() NOT NULL,
        "updated_at" timestamp(3) NOT NULL,
        "started_at" timestamp(3),
        "finished_at" timestamp(3)
      )
    `);
  }
}
