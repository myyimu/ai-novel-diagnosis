import { randomUUID } from "node:crypto";
import {
  real,
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

export const workspaceProjects = pgTable("workspace_projects", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3 }).notNull(),
});

export const revisionSessions = pgTable("revision_sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3 }).notNull(),
  chapterTitle: text("chapter_title").notNull(),
  genre: varchar("genre", { length: 64 }).notNull(),
  inputKind: varchar("input_kind", { length: 64 }).notNull(),
  textHash: text("text_hash").notNull(),
  textLength: integer("text_length").notNull(),
  quickScore: real("quick_score").notNull(),
  gateDecision: varchar("gate_decision", { length: 32 }).notNull(),
  mainProblem: text("main_problem").notNull(),
  issueTitles: jsonb("issue_titles").notNull(),
  issueCategories: jsonb("issue_categories").notNull(),
  nextPrompt: text("next_prompt"),
  revisionNote: text("revision_note"),
  revisionNoteUpdatedAt: timestamp("revision_note_updated_at", {
    precision: 3,
  }),
  methodologyCardIds: jsonb("methodology_card_ids").notNull(),
});

export const methodologyCards = pgTable("methodology_cards", {
  projectCardId: text("project_card_id").primaryKey(),
  projectId: text("project_id").notNull(),
  id: text("id").notNull(),
  sourceIssueId: text("source_issue_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: text("title").notNull(),
  triggerProblem: text("trigger_problem").notNull(),
  reusableRule: text("reusable_rule").notNull(),
  selfCheckQuestion: text("self_check_question").notNull(),
  promptTemplate: text("prompt_template"),
  firstSeenAt: timestamp("first_seen_at", { precision: 3 }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { precision: 3 }).notNull(),
  sourceChapterTitle: text("source_chapter_title").notNull(),
  sourceIssueTitle: text("source_issue_title"),
  occurrenceCount: integer("occurrence_count").notNull(),
  usageCount: integer("usage_count").notNull(),
});

export type AnalysisUploadSelect = typeof analysisUploads.$inferSelect;
export type AnalysisUploadInsert = typeof analysisUploads.$inferInsert;
export type BookAnalysisJobSelect = typeof bookAnalysisJobs.$inferSelect;
export type BookAnalysisJobInsert = typeof bookAnalysisJobs.$inferInsert;
export type WorkspaceProjectSelect = typeof workspaceProjects.$inferSelect;
export type RevisionSessionSelect = typeof revisionSessions.$inferSelect;
export type MethodologyCardSelect = typeof methodologyCards.$inferSelect;
