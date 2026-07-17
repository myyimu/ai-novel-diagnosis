import { Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import {
  storyAuditFindingReviews,
  type StoryAuditFindingReviewSelect,
} from "@/service/drizzle/schema";

/**
 * Snapshot of a persisted author review. Author review state is stored
 * SEPARATELY from the immutable StoryAuditResult so re-analysis cannot
 * overwrite it; deleting the source book job leaves these rows in place and
 * the UI marks the source as unavailable.
 */
export interface StoryAuditFindingReviewRecord {
  id: string;
  projectId: string;
  bookJobId: string;
  auditId: string;
  findingId: string;
  reviewState: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertFindingReviewInput {
  projectId: string;
  bookJobId: string;
  auditId: string;
  findingId: string;
  reviewState: string;
  note?: string;
}

/**
 * The only layer that reads/writes the `story_audit_finding_reviews` table.
 * Idempotent on the (project_id, audit_id, finding_id) unique key so the same
 * review upserted twice updates the existing row instead of duplicating.
 */
@Injectable()
export class StoryAuditFindingReviewRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async listByProject(input: {
    projectId: string;
    bookJobId?: string;
  }): Promise<StoryAuditFindingReviewRecord[]> {
    const conditions = [
      eq(storyAuditFindingReviews.projectId, input.projectId),
    ];
    if (input.bookJobId) {
      conditions.push(eq(storyAuditFindingReviews.bookJobId, input.bookJobId));
    }

    const rows = await this.drizzle.db
      .select()
      .from(storyAuditFindingReviews)
      .where(and(...conditions))
      .orderBy(asc(storyAuditFindingReviews.updatedAt));

    return rows.map((row) => this.toRecord(row));
  }

  async upsert(
    input: UpsertFindingReviewInput,
  ): Promise<StoryAuditFindingReviewRecord> {
    const [row] = await this.drizzle.db
      .insert(storyAuditFindingReviews)
      .values({
        projectId: input.projectId,
        bookJobId: input.bookJobId,
        auditId: input.auditId,
        findingId: input.findingId,
        reviewState: input.reviewState,
        note: input.note,
      })
      .onConflictDoUpdate({
        target: [
          storyAuditFindingReviews.projectId,
          storyAuditFindingReviews.auditId,
          storyAuditFindingReviews.findingId,
        ],
        set: {
          reviewState: input.reviewState,
          note: input.note,
          bookJobId: input.bookJobId,
        },
      })
      .returning();

    return this.toRecord(row);
  }

  private toRecord(
    row: StoryAuditFindingReviewSelect,
  ): StoryAuditFindingReviewRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      bookJobId: row.bookJobId,
      auditId: row.auditId,
      findingId: row.findingId,
      reviewState: row.reviewState,
      note: row.note ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
