import { Injectable } from "@nestjs/common";
import {
  type StoryAuditFindingReviewRecord,
  type UpsertFindingReviewInput,
  StoryAuditFindingReviewRepository,
} from "@/dao/repositories/story-audit-review.repository";

/**
 * Business logic for persisted author reviews of story audit findings.
 *
 * Reviews are stored separately from the immutable `StoryAuditResult`, so this
 * service never touches book-analysis job results. It only forwards validated
 * review payloads to the repository and returns persisted snapshots.
 */
@Injectable()
export class StoryAuditReviewService {
  constructor(private readonly reviews: StoryAuditFindingReviewRepository) {}

  listReviews(
    projectId: string,
    bookJobId?: string,
  ): Promise<StoryAuditFindingReviewRecord[]> {
    return this.reviews.listByProject({ projectId, bookJobId });
  }

  upsertReview(
    projectId: string,
    findingId: string,
    input: Omit<UpsertFindingReviewInput, "projectId" | "findingId">,
  ): Promise<StoryAuditFindingReviewRecord> {
    return this.reviews.upsert({ projectId, findingId, ...input });
  }
}
