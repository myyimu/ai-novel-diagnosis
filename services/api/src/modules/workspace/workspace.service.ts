import { Injectable } from "@nestjs/common";
import {
  UpdateRevisionNoteDto,
  UpsertStoryAuditFindingReviewDto,
  UpsertRevisionAssetsDto,
  UpsertWorkspaceProjectDto,
} from "./dto/workspace-assets.dto";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import type { RevisionIssueDecisionSnapshot } from "@/dao/entities/workspace-assets.entity";

/**
 * Workspace service — orchestrates workspace operations.
 * Controller should inject this service, NOT the repository directly.
 */
@Injectable()
export class WorkspaceService {
  constructor(private readonly workspaceAssets: WorkspaceAssetsRepository) {}

  async listAssets() {
    return this.workspaceAssets.listAssets();
  }

  async upsertProject(body: UpsertWorkspaceProjectDto) {
    return this.workspaceAssets.upsertProject(body.project);
  }

  async upsertRevisionAssets(body: UpsertRevisionAssetsDto) {
    return this.workspaceAssets.upsertRevisionAssets({
      project: body.project,
      session: {
        ...body.session,
        issueDecisions: body.session.issueDecisions?.map((decision) => ({
          ...decision,
          decision:
            decision.decision as RevisionIssueDecisionSnapshot["decision"],
        })),
      },
      revisionVersions: body.revisionVersions || [],
      methodologyCards: body.methodologyCards,
    });
  }

  async updateRevisionNote(sessionId: string, body: UpdateRevisionNoteDto) {
    return this.workspaceAssets.updateRevisionNote({
      sessionId,
      note: body.note,
      updatedAt: body.updatedAt,
    });
  }

  async listStoryAuditFindingReviews(params: {
    projectId: string;
    auditId?: string;
  }) {
    return this.workspaceAssets.listStoryAuditFindingReviews(params);
  }

  async upsertStoryAuditFindingReview(body: UpsertStoryAuditFindingReviewDto) {
    return this.workspaceAssets.upsertStoryAuditFindingReview({
      projectId: body.projectId,
      auditId: body.auditId,
      findingId: body.findingId,
      reviewState: body.reviewState,
      note: body.note,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    });
  }

  async readProjectPackage(projectId: string) {
    return this.workspaceAssets.readProjectPackage(projectId);
  }
}
