import { randomUUID } from "node:crypto";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// users 表定义
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: varchar("name", { length: 255 }).unique().notNull(),
  created: timestamp("created", { precision: 3 }).defaultNow().notNull(),
  updated: timestamp("updated", { precision: 3 })
    .notNull()
    .$onUpdate(() => new Date()),
});

// 推断类型
export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export const analysisUploads = pgTable("analysis_uploads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  title: varchar("title", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 64 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  rawTextPath: text("raw_text_path").notNull(),
  normalizedTextPath: text("normalized_text_path").notNull(),
  rawLength: integer("raw_length").notNull(),
  cleanedLength: integer("cleaned_length").notNull(),
  chapterCount: integer("chapter_count").notNull(),
  preprocessing: jsonb("preprocessing").notNull(),
  created: timestamp("created", { precision: 3 }).defaultNow().notNull(),
  updated: timestamp("updated", { precision: 3 })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const bookAnalysisJobs = pgTable("book_analysis_jobs", {
  id: text("id").primaryKey(),
  uploadId: text("upload_id"),
  type: varchar("type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  inputSummary: jsonb("input_summary").notNull(),
  progress: jsonb("progress").notNull(),
  preprocessing: jsonb("preprocessing"),
  partialResult: jsonb("partial_result"),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3 }).notNull(),
  startedAt: timestamp("started_at", { precision: 3 }),
  finishedAt: timestamp("finished_at", { precision: 3 }),
});

export type AnalysisUploadSelect = typeof analysisUploads.$inferSelect;
export type AnalysisUploadInsert = typeof analysisUploads.$inferInsert;
export type BookAnalysisJobSelect = typeof bookAnalysisJobs.$inferSelect;
export type BookAnalysisJobInsert = typeof bookAnalysisJobs.$inferInsert;
