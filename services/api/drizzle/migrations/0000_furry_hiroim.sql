CREATE TABLE "analysis_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"genre" varchar(64) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"raw_text_path" text NOT NULL,
	"normalized_text_path" text NOT NULL,
	"raw_length" integer NOT NULL,
	"cleaned_length" integer NOT NULL,
	"chapter_count" integer NOT NULL,
	"preprocessing" jsonb NOT NULL,
	"created" timestamp (3) DEFAULT now() NOT NULL,
	"updated" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_analysis_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text,
	"type" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"input_summary" jsonb NOT NULL,
	"progress" jsonb NOT NULL,
	"preprocessing" jsonb,
	"partial_result" jsonb,
	"result" jsonb,
	"error" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"started_at" timestamp (3),
	"finished_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "methodology_cards" (
	"project_card_id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"id" text NOT NULL,
	"source_issue_id" text NOT NULL,
	"type" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"trigger_problem" text NOT NULL,
	"reusable_rule" text NOT NULL,
	"self_check_question" text NOT NULL,
	"prompt_template" text,
	"first_seen_at" timestamp (3) NOT NULL,
	"last_seen_at" timestamp (3) NOT NULL,
	"source_chapter_title" text NOT NULL,
	"source_issue_title" text,
	"occurrence_count" integer NOT NULL,
	"usage_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revision_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
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
	"revision_note_updated_at" timestamp (3),
	"methodology_card_ids" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created" timestamp (3) DEFAULT now() NOT NULL,
	"updated" timestamp (3) NOT NULL,
	CONSTRAINT "users_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "workspace_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
