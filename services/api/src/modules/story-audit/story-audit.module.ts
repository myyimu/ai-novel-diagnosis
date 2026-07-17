import { Module } from "@nestjs/common";
import { StoryAuditFindingReviewRepository } from "@/dao/repositories/story-audit-review.repository";
import { StoryAuditOrchestratorService } from "./story-audit-orchestrator.service";
import { StoryAuditReviewController } from "./story-audit-review.controller";
import { StoryAuditReviewService } from "./story-audit-review.service";

@Module({
  controllers: [StoryAuditReviewController],
  providers: [
    StoryAuditReviewService,
    StoryAuditFindingReviewRepository,
    StoryAuditOrchestratorService,
  ],
  exports: [StoryAuditOrchestratorService],
})
export class StoryAuditModule {}
