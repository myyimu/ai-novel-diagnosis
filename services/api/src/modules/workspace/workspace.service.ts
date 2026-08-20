import { Injectable, NotFoundException } from "@nestjs/common";
import {
  UpdateRevisionNoteDto,
  UpsertStoryAuditFindingReviewDto,
  UpsertRevisionAssetsDto,
  UpsertWorkspaceProjectDto,
} from "./dto/workspace-assets.dto";
import {
  UpsertPremiseEngineCardDto,
  UpsertPremiseFindingReviewDto,
} from "./dto/premise-assets.dto";
import { UpdateDivergenceNoteDto } from "./dto/consultation-assets.dto";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import { ConsultationRecordsRepository } from "@/dao/repositories/consultation-records.repository";
import type { RevisionIssueDecisionSnapshot } from "@/dao/entities/workspace-assets.entity";

/**
 * Workspace service — orchestrates workspace operations.
 * Controller should inject this service, NOT the repository directly.
 */
@Injectable()
export class WorkspaceService {
  constructor(
    private readonly workspaceAssets: WorkspaceAssetsRepository,
    private readonly consultationRecords: ConsultationRecordsRepository,
  ) {}

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

  async readEngineCard(projectId: string) {
    return this.workspaceAssets.findEngineCardByProject(projectId);
  }

  async upsertEngineCard(body: UpsertPremiseEngineCardDto) {
    return this.workspaceAssets.upsertEngineCard({
      projectId: body.projectId,
      status: body.status,
      premiseSummary: body.premiseSummary,
      coreConflict: body.coreConflict,
      protagonistDesire: body.protagonistDesire,
      opposingForce: body.opposingForce,
      irreducibilityTest: body.irreducibilityTest,
      readerHookQuestion: body.readerHookQuestion,
      engineVerdict: body.engineVerdict,
      genre: body.genre,
      reviewId: body.reviewId,
      confirmedAt:
        body.status === "confirmed"
          ? (body.confirmedAt ?? new Date().toISOString())
          : undefined,
      updatedAt: body.updatedAt,
    });
  }

  async listPremiseFindingReviews(params: {
    projectId: string;
    reviewId?: string;
  }) {
    return this.workspaceAssets.listPremiseFindingReviews(params);
  }

  async upsertPremiseFindingReview(body: UpsertPremiseFindingReviewDto) {
    return this.workspaceAssets.upsertPremiseFindingReview({
      projectId: body.projectId,
      reviewId: body.reviewId,
      findingId: body.findingId,
      reviewState: body.reviewState,
      note: body.note,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    });
  }

  async listPremiseConsults(projectId: string) {
    return this.consultationRecords.listPremiseConsultsByProject(projectId);
  }

  async listReportDivergences(projectId: string) {
    return this.consultationRecords.listReportDivergencesByProject(projectId);
  }

  /** Persist the author's adjudication note; the detection itself is immutable. */
  async updateReportDivergenceNote(
    recordId: string,
    body: UpdateDivergenceNoteDto,
  ) {
    const record = await this.consultationRecords.updateReportDivergenceNote(
      recordId,
      body.note,
    );
    if (!record) {
      throw new NotFoundException(
        `分歧记录 ${recordId} 不存在（只有真实模型检测且带项目号的记录才会落库）。`,
      );
    }
    return record;
  }
}
