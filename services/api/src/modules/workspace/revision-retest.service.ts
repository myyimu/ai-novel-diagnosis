import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  buildPromptAttribution,
  buildRevisionComparison,
  createRevisionVersion,
  findPreviousRevisionVersion,
  findRevisionVersionForDraft,
  hasComparableQuickScore,
  hashRevisionText,
  type PromptAttributionSummary,
  type RevisionComparison,
} from "@ai-novel-diagnosis/ai-core";
import { ErrorCode } from "@/core/constants/error-code";
import { BusinessException } from "@/core/exceptions/business.exception";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import type {
  RevisionSessionSnapshot,
  RevisionTextVersionSnapshot,
} from "@/dao/entities/workspace-assets.entity";
import { AnalysisService } from "@/modules/analysis/analysis.service";
import type { QuickReviewDto } from "@/modules/analysis/dto/quick-review.dto";
import type { RevisionRetestDto } from "./dto/revision-retest.dto";

export interface RevisionRetestResponse {
  session: RevisionSessionSnapshot;
  previousSession: RevisionSessionSnapshot;
  comparison: RevisionComparison | null;
  promptAttribution: PromptAttributionSummary;
  createdVersion: RevisionTextVersionSnapshot | null;
}

// 与 QuickReviewDto.chapterText 的 MinLength(50) 保持一致：
// 服务间调用不经过管道，这里显式兜底。
const retestMinChapterTextLength = 50;

const quickReviewInputKinds = [
  "human-draft",
  "ai-draft",
  "idea",
  "outline",
  "prompt",
] as const;

/**
 * 服务端复诊：读取 pending 会话（携带改稿前诊断 R1 与版本对），
 * 以 to 版本文本重新跑 quick-review，然后就地更新该会话为 R2。
 * 先诊断、诊断成功后才落库 —— 失败时会话保持 pending 可重试。
 */
@Injectable()
export class RevisionRetestService {
  private readonly logger = new Logger(RevisionRetestService.name);

  constructor(
    private readonly assets: WorkspaceAssetsRepository,
    private readonly analysis: AnalysisService,
  ) {}

  async runRetest(
    sessionId: string,
    input: RevisionRetestDto,
  ): Promise<RevisionRetestResponse> {
    const session = await this.assets.findRevisionSessionById(sessionId);

    if (session.retestStatus !== "pending") {
      throw new BusinessException(
        ErrorCode.RESOURCE_CONFLICT,
        "复诊会话不处于待复诊状态，无法重复复诊",
        HttpStatus.CONFLICT,
      );
    }

    const projectId = session.projectId || "default-project";
    const target = await this.resolveTargetVersion({
      session,
      projectId,
      toVersionText: input.toVersionText?.trim(),
    });

    if (target.text.length < retestMinChapterTextLength) {
      throw new BusinessException(
        ErrorCode.INVALID_PARAMS,
        `复诊目标正文过短（至少 ${retestMinChapterTextLength} 字）`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const body: QuickReviewDto = {
      chapterText: target.text,
      title: session.chapterTitle,
      genre: session.genre,
      inputKind: this.toQuickReviewInputKind(session.inputKind),
      previousPrompt: session.nextPrompt,
      diagnosticFocus: input.diagnosticFocus,
      coreSellingPoint: input.coreSellingPoint,
      mustKeepMechanisms: input.mustKeepMechanisms,
      targetReaderPleasures: input.targetReaderPleasures,
      provider: input.provider,
    };
    const result = await this.analysis.quickReview(body);

    // 诊断成功后才写版本与会话，失败路径不会留下半成品状态
    if (target.createdVersion) {
      await this.assets.upsertRevisionTextVersion(
        target.createdVersion,
        projectId,
      );
    }

    const updated = await this.assets.completeRevisionRetest({
      sessionId: session.id,
      chapterTitle: result.title?.trim() || session.chapterTitle,
      genre: result.genre || session.genre,
      inputKind:
        this.toQuickReviewInputKind(result.inputKind) || session.inputKind,
      textHash: hashRevisionText(target.text),
      textLength: target.text.length,
      quickScore: hasComparableQuickScore(result.quickScore)
        ? result.quickScore
        : null,
      gateDecision: result.gateDecision || "revise",
      mainProblem: result.mainProblem || "未返回明确问题",
      issueTitles: this.toIssueTitles(result),
      issueCategories: this.toIssueCategories(result),
      nextPrompt: result.nextPrompt?.prompt,
      toVersionId: target.toVersionId,
    });

    this.logger.log(
      {
        session_id: session.id,
        project_id: projectId,
        action: "revision.retest.completed",
        quick_score: updated.quickScore,
        created_version_id: target.createdVersion?.id ?? null,
      },
      "revision retest completed",
    );

    // 对比基线是改稿前诊断 R1（pending 会话写入的快照）；
    // 归因按时间倒序覆盖 [R2, R1, ...更早会话]，与导出路径同构。
    const comparison = buildRevisionComparison({
      current: updated,
      previous: session,
    });
    const earlierSessions = await this.assets.listProjectSessionsBefore(
      projectId,
      session.createdAt,
    );
    const promptAttribution = buildPromptAttribution([
      updated,
      session,
      ...earlierSessions,
    ]);

    return {
      session: updated,
      previousSession: session,
      comparison,
      promptAttribution,
      createdVersion: target.createdVersion,
    };
  }

  private async resolveTargetVersion(input: {
    session: RevisionSessionSnapshot;
    projectId: string;
    toVersionText?: string;
  }): Promise<{
    text: string;
    toVersionId?: string;
    createdVersion: RevisionTextVersionSnapshot | null;
  }> {
    const { session, projectId, toVersionText } = input;

    if (toVersionText) {
      const versions = await this.assets.listProjectRevisionVersions(projectId);
      const existing = findRevisionVersionForDraft({
        versions,
        projectId,
        chapterTitle: session.chapterTitle,
        chapterText: toVersionText,
      });

      if (existing) {
        return {
          text: toVersionText,
          toVersionId: existing.id,
          createdVersion: null,
        };
      }

      const previousVersion = findPreviousRevisionVersion({
        versions,
        projectId,
        chapterTitle: session.chapterTitle,
        chapterText: toVersionText,
      });
      const createdVersion = createRevisionVersion({
        projectId,
        chapterTitle: session.chapterTitle,
        chapterText: toVersionText,
        sourceSessionId: session.id,
        previousVersion,
        existingVersions: versions,
      });

      return {
        text: toVersionText,
        toVersionId: createdVersion.id,
        createdVersion,
      };
    }

    if (!session.toVersionId) {
      throw new BusinessException(
        ErrorCode.INVALID_PARAMS,
        "复诊会话缺少目标正文版本，且请求未提供 toVersionText",
        HttpStatus.BAD_REQUEST,
      );
    }

    const version = await this.assets.findRevisionTextVersionById(
      session.toVersionId,
    );
    if (!version) {
      throw new BusinessException(
        ErrorCode.INVALID_PARAMS,
        `复诊目标正文版本不存在: ${session.toVersionId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      text: version.text.trim(),
      toVersionId: version.id,
      createdVersion: null,
    };
  }

  private toQuickReviewInputKind(
    value: string | undefined,
  ): QuickReviewDto["inputKind"] {
    return quickReviewInputKinds.includes(
      value as (typeof quickReviewInputKinds)[number],
    )
      ? (value as QuickReviewDto["inputKind"])
      : undefined;
  }

  private toIssueTitles(
    result: Awaited<ReturnType<AnalysisService["quickReview"]>>,
  ) {
    return (result.issues || [])
      .map((issue) => issue.title)
      .filter(Boolean)
      .slice(0, 5);
  }

  private toIssueCategories(
    result: Awaited<ReturnType<AnalysisService["quickReview"]>>,
  ) {
    return (result.issues || [])
      .map((issue) => issue.category)
      .filter(Boolean)
      .slice(0, 5);
  }
}
