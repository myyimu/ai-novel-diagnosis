CREATE INDEX "book_analysis_jobs_upload_id_idx" ON "book_analysis_jobs" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "book_analysis_jobs_status_idx" ON "book_analysis_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "methodology_cards_project_id_idx" ON "methodology_cards" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "model_usage_events_job_id_idx" ON "model_usage_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "revision_sessions_project_id_idx" ON "revision_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "revision_text_versions_project_id_idx" ON "revision_text_versions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "revision_text_versions_source_session_id_idx" ON "revision_text_versions" USING btree ("source_session_id");