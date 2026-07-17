CREATE TABLE "model_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
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
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_audit_finding_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"book_job_id" text NOT NULL,
	"audit_id" text NOT NULL,
	"finding_id" text NOT NULL,
	"review_state" varchar(32) NOT NULL,
	"note" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD COLUMN "story_audit_finding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_projects" ADD COLUMN "book_job_id" text;--> statement-breakpoint
ALTER TABLE "workspace_projects" ADD COLUMN "analysis_purpose" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "story_audit_finding_reviews_uniq" ON "story_audit_finding_reviews" USING btree ("project_id","audit_id","finding_id");