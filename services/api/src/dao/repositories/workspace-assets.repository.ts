import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import {
  methodologyCards,
  premiseEngineCards,
  premiseFindingReviews,
  revisionSessions,
  revisionTextVersions,
  storyAuditFindingReviews,
  workspaceProjects,
  type MethodologyCardSelect,
  type PremiseEngineCardSelect,
  type PremiseFindingReviewSelect,
  type RevisionSessionSelect,
  type RevisionTextVersionSelect,
  type StoryAuditFindingReviewSelect,
  type WorkspaceProjectSelect,
} from "@/service/drizzle/schema";
import type {
  PremiseEngineCard,
  PremiseFindingReview,
  PremiseFindingReviewState,
  ProjectMethodologyCardSnapshot,
  RevisionIssueDecisionSnapshot,
  RevisionSessionSnapshot,
  RevisionTextVersionSnapshot,
  StoryAuditFindingReviewSnapshot,
  StoryAuditFindingReviewState,
  WorkspaceAssetsSnapshot,
  WorkspaceProjectSnapshot,
} from "@/dao/entities/workspace-assets.entity";

@Injectable()
export class WorkspaceAssetsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async listAssets(): Promise<WorkspaceAssetsSnapshot> {
    const [projects, sessions, versions, cards, engineCards] =
      await Promise.all([
        this.drizzle.db
          .select()
          .from(workspaceProjects)
          .orderBy(desc(workspaceProjects.updatedAt)),
        this.drizzle.db
          .select()
          .from(revisionSessions)
          .orderBy(desc(revisionSessions.createdAt)),
        this.drizzle.db
          .select()
          .from(revisionTextVersions)
          .orderBy(desc(revisionTextVersions.createdAt)),
        this.drizzle.db
          .select()
          .from(methodologyCards)
          .orderBy(desc(methodologyCards.lastSeenAt)),
        this.drizzle.db
          .select()
          .from(premiseEngineCards)
          .orderBy(desc(premiseEngineCards.updatedAt)),
      ]);

    return {
      projects: projects.map((row) => this.projectSnapshot(row)),
      revisionSessions: sessions.map((row) =>
        this.revisionSessionSnapshot(row),
      ),
      revisionVersions: versions.map((row) =>
        this.revisionTextVersionSnapshot(row),
      ),
      methodologyCards: cards.map((row) => this.methodologyCardSnapshot(row)),
      premiseEngineCards: engineCards.map((row) =>
        this.premiseEngineCardSnapshot(row),
      ),
    };
  }

  async upsertProject(
    project: WorkspaceProjectSnapshot,
  ): Promise<WorkspaceProjectSnapshot> {
    const now = new Date();
    const [row] = await this.drizzle.db
      .insert(workspaceProjects)
      .values({
        id: project.id,
        name: project.name,
        bookJobId: project.bookJobId,
        analysisPurpose: project.analysisPurpose,
        createdAt: toDate(project.createdAt, now),
        updatedAt: toDate(project.updatedAt, now),
      })
      .onConflictDoUpdate({
        target: workspaceProjects.id,
        set: {
          name: project.name,
          bookJobId: project.bookJobId,
          analysisPurpose: project.analysisPurpose,
          updatedAt: toDate(project.updatedAt, now),
        },
      })
      .returning();

    return this.projectSnapshot(row);
  }

  async upsertRevisionAssets(input: {
    project: WorkspaceProjectSnapshot;
    session: RevisionSessionSnapshot;
    revisionVersions: RevisionTextVersionSnapshot[];
    methodologyCards: ProjectMethodologyCardSnapshot[];
  }): Promise<WorkspaceAssetsSnapshot> {
    await this.upsertProject(input.project);
    const session = input.session;
    const now = new Date();

    await this.drizzle.db
      .insert(revisionSessions)
      .values({
        id: session.id,
        projectId: session.projectId || input.project.id,
        createdAt: toDate(session.createdAt, now),
        updatedAt: now,
        chapterTitle: session.chapterTitle,
        genre: session.genre,
        inputKind: session.inputKind,
        textHash: session.textHash,
        textLength: session.textLength,
        quickScore: session.quickScore ?? null,
        gateDecision: session.gateDecision,
        mainProblem: session.mainProblem,
        issueTitles: session.issueTitles,
        issueCategories: session.issueCategories || [],
        issueDecisions: session.issueDecisions || [],
        retestStatus: session.retestStatus || "not_requested",
        nextPrompt: session.nextPrompt,
        revisionNote: session.revisionNote,
        revisionNoteUpdatedAt: session.revisionNoteUpdatedAt
          ? toDate(session.revisionNoteUpdatedAt, now)
          : undefined,
        fromVersionId: session.fromVersionId,
        toVersionId: session.toVersionId,
        textChanged: session.textChanged ?? true,
        storyAuditFindingIds: session.storyAuditFindingIds || [],
        methodologyCardIds: session.methodologyCardIds,
      })
      .onConflictDoUpdate({
        target: revisionSessions.id,
        set: {
          updatedAt: now,
          chapterTitle: session.chapterTitle,
          genre: session.genre,
          inputKind: session.inputKind,
          textHash: session.textHash,
          textLength: session.textLength,
          quickScore: session.quickScore ?? null,
          gateDecision: session.gateDecision,
          mainProblem: session.mainProblem,
          issueTitles: session.issueTitles,
          issueCategories: session.issueCategories || [],
          issueDecisions: session.issueDecisions || [],
          retestStatus: session.retestStatus || "not_requested",
          nextPrompt: session.nextPrompt,
          revisionNote: session.revisionNote,
          revisionNoteUpdatedAt: session.revisionNoteUpdatedAt
            ? toDate(session.revisionNoteUpdatedAt, now)
            : null,
          fromVersionId: session.fromVersionId,
          toVersionId: session.toVersionId,
          textChanged: session.textChanged ?? true,
          storyAuditFindingIds: session.storyAuditFindingIds || [],
          methodologyCardIds: session.methodologyCardIds,
        },
      });

    for (const version of input.revisionVersions) {
      await this.upsertRevisionTextVersion(version, input.project.id);
    }

    for (const card of input.methodologyCards) {
      await this.upsertMethodologyCard(card, input.project.id);
    }

    return this.listAssets();
  }

  async updateRevisionNote(input: {
    sessionId: string;
    note: string;
    updatedAt?: string;
  }): Promise<RevisionSessionSnapshot> {
    const updatedAt = toDate(input.updatedAt, new Date());
    const [row] = await this.drizzle.db
      .update(revisionSessions)
      .set({
        revisionNote: input.note,
        revisionNoteUpdatedAt: updatedAt,
        updatedAt,
      })
      .where(eq(revisionSessions.id, input.sessionId))
      .returning();

    if (!row) {
      throw new NotFoundException(
        `Revision session not found: ${input.sessionId}`,
      );
    }

    return this.revisionSessionSnapshot(row);
  }

  async findRevisionSessionById(
    sessionId: string,
  ): Promise<RevisionSessionSnapshot> {
    const [row] = await this.drizzle.db
      .select()
      .from(revisionSessions)
      .where(eq(revisionSessions.id, sessionId))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Revision session not found: ${sessionId}`);
    }

    return this.revisionSessionSnapshot(row);
  }

  async findRevisionTextVersionById(
    versionId: string,
  ): Promise<RevisionTextVersionSnapshot | null> {
    const [row] = await this.drizzle.db
      .select()
      .from(revisionTextVersions)
      .where(eq(revisionTextVersions.id, versionId))
      .limit(1);

    return row ? this.revisionTextVersionSnapshot(row) : null;
  }

  async listProjectRevisionVersions(
    projectId: string,
  ): Promise<RevisionTextVersionSnapshot[]> {
    const rows = await this.drizzle.db
      .select()
      .from(revisionTextVersions)
      .where(eq(revisionTextVersions.projectId, projectId))
      .orderBy(asc(revisionTextVersions.createdAt));

    return rows.map((row) => this.revisionTextVersionSnapshot(row));
  }

  async listProjectSessionsBefore(
    projectId: string,
    beforeIso: string,
  ): Promise<RevisionSessionSnapshot[]> {
    const rows = await this.drizzle.db
      .select()
      .from(revisionSessions)
      .where(
        and(
          eq(revisionSessions.projectId, projectId),
          lt(revisionSessions.createdAt, toDate(beforeIso, new Date(0))),
        ),
      )
      .orderBy(desc(revisionSessions.createdAt));

    return rows.map((row) => this.revisionSessionSnapshot(row));
  }

  async completeRevisionRetest(input: {
    sessionId: string;
    chapterTitle: string;
    genre: string;
    inputKind: string;
    textHash: string;
    textLength: number;
    quickScore: number | null;
    gateDecision: string;
    mainProblem: string;
    issueTitles: string[];
    issueCategories: string[];
    nextPrompt?: string;
    toVersionId?: string;
  }): Promise<RevisionSessionSnapshot> {
    const [row] = await this.drizzle.db
      .update(revisionSessions)
      .set({
        chapterTitle: input.chapterTitle,
        genre: input.genre,
        inputKind: input.inputKind,
        textHash: input.textHash,
        textLength: input.textLength,
        quickScore: input.quickScore,
        gateDecision: input.gateDecision,
        mainProblem: input.mainProblem,
        issueTitles: input.issueTitles,
        issueCategories: input.issueCategories,
        nextPrompt: input.nextPrompt,
        toVersionId: input.toVersionId,
        retestStatus: "completed",
        updatedAt: new Date(),
      })
      .where(eq(revisionSessions.id, input.sessionId))
      .returning();

    if (!row) {
      throw new NotFoundException(
        `Revision session not found: ${input.sessionId}`,
      );
    }

    return this.revisionSessionSnapshot(row);
  }

  async listStoryAuditFindingReviews(input: {
    projectId: string;
    auditId?: string;
    findingId?: string;
  }): Promise<StoryAuditFindingReviewSnapshot[]> {
    const conditions = [
      eq(storyAuditFindingReviews.projectId, input.projectId),
    ];
    if (input.auditId) {
      conditions.push(eq(storyAuditFindingReviews.auditId, input.auditId));
    }
    if (input.findingId) {
      conditions.push(eq(storyAuditFindingReviews.findingId, input.findingId));
    }

    const rows = await this.drizzle.db
      .select()
      .from(storyAuditFindingReviews)
      .where(and(...conditions))
      .orderBy(desc(storyAuditFindingReviews.updatedAt));

    return rows.map((row) => this.storyAuditFindingReviewSnapshot(row));
  }

  async upsertStoryAuditFindingReview(
    review: StoryAuditFindingReviewSnapshot,
  ): Promise<StoryAuditFindingReviewSnapshot> {
    const updatedAt = toDate(review.updatedAt, new Date());
    const [row] = await this.drizzle.db
      .insert(storyAuditFindingReviews)
      .values({
        projectId: review.projectId,
        auditId: review.auditId,
        findingId: review.findingId,
        reviewState: review.reviewState,
        note: review.note,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          storyAuditFindingReviews.projectId,
          storyAuditFindingReviews.auditId,
          storyAuditFindingReviews.findingId,
        ],
        set: {
          reviewState: review.reviewState,
          note: review.note,
          updatedAt,
        },
      })
      .returning();

    return this.storyAuditFindingReviewSnapshot(row);
  }

  async findEngineCardByProject(
    projectId: string,
  ): Promise<PremiseEngineCard | null> {
    const [row] = await this.drizzle.db
      .select()
      .from(premiseEngineCards)
      .where(eq(premiseEngineCards.projectId, projectId))
      .limit(1);

    return row ? this.premiseEngineCardSnapshot(row) : null;
  }

  async upsertEngineCard(card: PremiseEngineCard): Promise<PremiseEngineCard> {
    const updatedAt = toDate(card.updatedAt, new Date());
    const confirmedAt = card.confirmedAt
      ? toDate(card.confirmedAt, updatedAt)
      : null;
    const [row] = await this.drizzle.db
      .insert(premiseEngineCards)
      .values({
        projectId: card.projectId,
        status: card.status,
        premiseSummary: card.premiseSummary,
        coreConflict: card.coreConflict,
        protagonistDesire: card.protagonistDesire,
        opposingForce: card.opposingForce,
        irreducibilityTest: card.irreducibilityTest,
        readerHookQuestion: card.readerHookQuestion,
        engineVerdict: card.engineVerdict,
        genre: card.genre,
        reviewId: card.reviewId,
        confirmedAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: premiseEngineCards.projectId,
        set: {
          status: card.status,
          premiseSummary: card.premiseSummary,
          coreConflict: card.coreConflict,
          protagonistDesire: card.protagonistDesire,
          opposingForce: card.opposingForce,
          irreducibilityTest: card.irreducibilityTest,
          readerHookQuestion: card.readerHookQuestion,
          engineVerdict: card.engineVerdict,
          genre: card.genre,
          reviewId: card.reviewId,
          confirmedAt,
          updatedAt,
        },
      })
      .returning();

    return this.premiseEngineCardSnapshot(row);
  }

  async listPremiseFindingReviews(input: {
    projectId: string;
    reviewId?: string;
  }): Promise<PremiseFindingReview[]> {
    const conditions = [eq(premiseFindingReviews.projectId, input.projectId)];
    if (input.reviewId) {
      conditions.push(eq(premiseFindingReviews.reviewId, input.reviewId));
    }

    const rows = await this.drizzle.db
      .select()
      .from(premiseFindingReviews)
      .where(and(...conditions))
      .orderBy(desc(premiseFindingReviews.updatedAt));

    return rows.map((row) => this.premiseFindingReviewSnapshot(row));
  }

  async upsertPremiseFindingReview(
    review: PremiseFindingReview,
  ): Promise<PremiseFindingReview> {
    const updatedAt = toDate(review.updatedAt, new Date());
    const [row] = await this.drizzle.db
      .insert(premiseFindingReviews)
      .values({
        projectId: review.projectId,
        reviewId: review.reviewId,
        findingId: review.findingId,
        reviewState: review.reviewState,
        note: review.note,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          premiseFindingReviews.projectId,
          premiseFindingReviews.reviewId,
          premiseFindingReviews.findingId,
        ],
        set: {
          reviewState: review.reviewState,
          note: review.note,
          updatedAt,
        },
      })
      .returning();

    return this.premiseFindingReviewSnapshot(row);
  }

  async readProjectPackage(projectId: string) {
    const [project] = await this.drizzle.db
      .select()
      .from(workspaceProjects)
      .where(eq(workspaceProjects.id, projectId))
      .limit(1);

    if (!project) {
      throw new NotFoundException(`Workspace project not found: ${projectId}`);
    }

    const [sessions, versions, cards, engineCards] = await Promise.all([
      this.drizzle.db
        .select()
        .from(revisionSessions)
        .where(eq(revisionSessions.projectId, projectId))
        .orderBy(asc(revisionSessions.createdAt)),
      this.drizzle.db
        .select()
        .from(revisionTextVersions)
        .where(eq(revisionTextVersions.projectId, projectId))
        .orderBy(asc(revisionTextVersions.createdAt)),
      this.drizzle.db
        .select()
        .from(methodologyCards)
        .where(eq(methodologyCards.projectId, projectId))
        .orderBy(desc(methodologyCards.occurrenceCount)),
      this.drizzle.db
        .select()
        .from(premiseEngineCards)
        .where(eq(premiseEngineCards.projectId, projectId))
        .limit(1),
    ]);

    return {
      project: this.projectSnapshot(project),
      revisionSessions: sessions.map((row) =>
        this.revisionSessionSnapshot(row),
      ),
      revisionVersions: versions.map((row) =>
        this.revisionTextVersionSnapshot(row),
      ),
      methodologyCards: cards.map((row) => this.methodologyCardSnapshot(row)),
      engineCard: engineCards[0]
        ? this.premiseEngineCardSnapshot(engineCards[0])
        : null,
    };
  }

  async upsertRevisionTextVersion(
    version: RevisionTextVersionSnapshot,
    fallbackProjectId: string,
  ): Promise<void> {
    await this.drizzle.db
      .insert(revisionTextVersions)
      .values({
        id: version.id,
        projectId: version.projectId || fallbackProjectId,
        createdAt: toDate(version.createdAt, new Date()),
        chapterTitle: version.chapterTitle,
        versionLabel: version.versionLabel,
        textHash: version.textHash,
        textLength: version.textLength,
        text: version.text,
        sourceSessionId: version.sourceSessionId,
        previousVersionId: version.previousVersionId,
      })
      .onConflictDoUpdate({
        target: revisionTextVersions.id,
        set: {
          projectId: version.projectId || fallbackProjectId,
          chapterTitle: version.chapterTitle,
          versionLabel: version.versionLabel,
          textHash: version.textHash,
          textLength: version.textLength,
          text: version.text,
          sourceSessionId: version.sourceSessionId,
          previousVersionId: version.previousVersionId,
        },
      });
  }

  private async upsertMethodologyCard(
    card: ProjectMethodologyCardSnapshot,
    fallbackProjectId: string,
  ) {
    await this.drizzle.db
      .insert(methodologyCards)
      .values({
        projectCardId: card.projectCardId,
        projectId: card.projectId || fallbackProjectId,
        id: card.id,
        sourceIssueId: card.sourceIssueId,
        type: card.type,
        title: card.title,
        triggerProblem: card.triggerProblem,
        reusableRule: card.reusableRule,
        selfCheckQuestion: card.selfCheckQuestion,
        promptTemplate: card.promptTemplate,
        firstSeenAt: toDate(card.firstSeenAt, new Date()),
        lastSeenAt: toDate(card.lastSeenAt, new Date()),
        sourceChapterTitle: card.sourceChapterTitle,
        sourceIssueTitle: card.sourceIssueTitle,
        occurrenceCount: card.occurrenceCount,
        usageCount: card.usageCount || 0,
      })
      .onConflictDoUpdate({
        target: methodologyCards.projectCardId,
        set: {
          projectId: card.projectId || fallbackProjectId,
          sourceIssueId: card.sourceIssueId,
          type: card.type,
          title: card.title,
          triggerProblem: card.triggerProblem,
          reusableRule: card.reusableRule,
          selfCheckQuestion: card.selfCheckQuestion,
          promptTemplate: card.promptTemplate,
          lastSeenAt: toDate(card.lastSeenAt, new Date()),
          sourceChapterTitle: card.sourceChapterTitle,
          sourceIssueTitle: card.sourceIssueTitle,
          occurrenceCount: card.occurrenceCount,
          usageCount: card.usageCount || 0,
        },
      });
  }

  private projectSnapshot(
    row: WorkspaceProjectSelect,
  ): WorkspaceProjectSnapshot {
    return {
      id: row.id,
      name: row.name,
      bookJobId: row.bookJobId ?? undefined,
      analysisPurpose: row.analysisPurpose ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private revisionSessionSnapshot(
    row: RevisionSessionSelect,
  ): RevisionSessionSnapshot {
    return {
      id: row.id,
      projectId: row.projectId,
      createdAt: row.createdAt.toISOString(),
      chapterTitle: row.chapterTitle,
      genre: row.genre,
      inputKind: row.inputKind,
      textHash: row.textHash,
      textLength: row.textLength,
      quickScore: row.quickScore,
      gateDecision: row.gateDecision,
      mainProblem: row.mainProblem,
      issueTitles: toStringList(row.issueTitles),
      issueCategories: toStringList(row.issueCategories),
      issueDecisions: toRevisionIssueDecisions(row.issueDecisions),
      retestStatus:
        row.retestStatus === "pending" || row.retestStatus === "completed"
          ? row.retestStatus
          : "not_requested",
      nextPrompt: row.nextPrompt ?? undefined,
      revisionNote: row.revisionNote ?? undefined,
      revisionNoteUpdatedAt: row.revisionNoteUpdatedAt?.toISOString(),
      fromVersionId: row.fromVersionId ?? undefined,
      toVersionId: row.toVersionId ?? undefined,
      textChanged: row.textChanged,
      storyAuditFindingIds: toStringList(row.storyAuditFindingIds),
      methodologyCardIds: toStringList(row.methodologyCardIds),
    };
  }

  private revisionTextVersionSnapshot(
    row: RevisionTextVersionSelect,
  ): RevisionTextVersionSnapshot {
    return {
      id: row.id,
      projectId: row.projectId,
      createdAt: row.createdAt.toISOString(),
      chapterTitle: row.chapterTitle,
      versionLabel: row.versionLabel,
      textHash: row.textHash,
      textLength: row.textLength,
      text: row.text,
      sourceSessionId: row.sourceSessionId ?? undefined,
      previousVersionId: row.previousVersionId ?? undefined,
    };
  }

  private methodologyCardSnapshot(
    row: MethodologyCardSelect,
  ): ProjectMethodologyCardSnapshot {
    return {
      id: row.id,
      projectCardId: row.projectCardId,
      projectId: row.projectId,
      sourceIssueId: row.sourceIssueId,
      type: row.type,
      title: row.title,
      triggerProblem: row.triggerProblem,
      reusableRule: row.reusableRule,
      selfCheckQuestion: row.selfCheckQuestion,
      promptTemplate: row.promptTemplate ?? undefined,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      sourceChapterTitle: row.sourceChapterTitle,
      sourceIssueTitle: row.sourceIssueTitle ?? undefined,
      occurrenceCount: row.occurrenceCount,
      usageCount: row.usageCount,
    };
  }

  private storyAuditFindingReviewSnapshot(
    row: StoryAuditFindingReviewSelect,
  ): StoryAuditFindingReviewSnapshot {
    return {
      projectId: row.projectId,
      auditId: row.auditId,
      findingId: row.findingId,
      reviewState: row.reviewState as StoryAuditFindingReviewState,
      note: row.note ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private premiseEngineCardSnapshot(
    row: PremiseEngineCardSelect,
  ): PremiseEngineCard {
    return {
      projectId: row.projectId,
      status: row.status === "confirmed" ? "confirmed" : "draft",
      premiseSummary: row.premiseSummary,
      coreConflict: row.coreConflict,
      protagonistDesire: row.protagonistDesire,
      opposingForce: row.opposingForce,
      irreducibilityTest: row.irreducibilityTest,
      readerHookQuestion: row.readerHookQuestion,
      engineVerdict: row.engineVerdict as PremiseEngineCard["engineVerdict"],
      genre: row.genre ?? undefined,
      reviewId: row.reviewId ?? undefined,
      confirmedAt: row.confirmedAt?.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private premiseFindingReviewSnapshot(
    row: PremiseFindingReviewSelect,
  ): PremiseFindingReview {
    return {
      projectId: row.projectId,
      reviewId: row.reviewId,
      findingId: row.findingId,
      reviewState: row.reviewState as PremiseFindingReviewState,
      note: row.note ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function toDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

function toRevisionIssueDecisions(
  value: unknown,
): RevisionIssueDecisionSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const candidate = item as Record<string, unknown>;
    const decision = candidate.decision;
    if (
      typeof candidate.issueId !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.adopted !== "boolean" ||
      !["accepted", "author_intent", "false_positive", "deferred"].includes(
        decision as string,
      )
    ) {
      return [];
    }
    return [
      {
        issueId: candidate.issueId,
        title: candidate.title,
        decision: decision as RevisionIssueDecisionSnapshot["decision"],
        adopted: candidate.adopted,
      },
    ];
  });
}
