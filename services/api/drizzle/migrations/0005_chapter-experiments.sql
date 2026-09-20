CREATE TABLE "chapter_experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chapter_experiments_project_idx" ON "chapter_experiments" USING btree ("project_id");