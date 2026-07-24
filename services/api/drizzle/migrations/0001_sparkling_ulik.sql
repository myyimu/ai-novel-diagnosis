ALTER TABLE "revision_sessions" ALTER COLUMN "quick_score" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspace_projects" ADD COLUMN "book_job_id" text;
--> statement-breakpoint
ALTER TABLE "workspace_projects" ADD COLUMN "analysis_purpose" varchar(64);
--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD COLUMN "from_version_id" text;
--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD COLUMN "to_version_id" text;
--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD COLUMN "text_changed" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD COLUMN "story_audit_finding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
CREATE TABLE "revision_text_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"chapter_title" text NOT NULL,
	"version_label" varchar(32) NOT NULL,
	"text_hash" text NOT NULL,
	"text_length" integer NOT NULL,
	"text" text NOT NULL,
	"source_session_id" text,
	"previous_version_id" text
);
--> statement-breakpoint
CREATE TABLE "story_audit_finding_reviews" (
	"project_id" text NOT NULL,
	"audit_id" text NOT NULL,
	"finding_id" text NOT NULL,
	"review_state" varchar(64) NOT NULL,
	"note" text,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "story_audit_finding_reviews_unique" ON "story_audit_finding_reviews" USING btree ("project_id","audit_id","finding_id");
