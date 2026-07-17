import { Module } from "@nestjs/common";
import { StoryAuditFindingReviewRepository } from "@/dao/repositories/story-audit-review.repository";
import { StoryAuditReviewController } from "./story-audit-review.controller";
import { StoryAuditReviewService } from "./story-audit-review.service";

@Module({
  controllers: [StoryAuditReviewController],
  providers: [StoryAuditReviewService, StoryAuditFindingReviewRepository],
})
export class StoryAuditModule {}
