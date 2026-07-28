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
ALTER TABLE "revision_sessions" ALTER COLUMN "text_changed" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "revision_sessions" ALTER COLUMN "story_audit_finding_ids" DROP DEFAULT;