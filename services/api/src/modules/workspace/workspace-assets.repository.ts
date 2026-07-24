import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import {
  methodologyCards,
  revisionSessions,
  revisionTextVersions,
  storyAuditFindingReviews,
  workspaceProjects,
  type MethodologyCardSelect,
  type RevisionSessionSelect,
  type RevisionTextVersionSelect,
  type StoryAuditFindingReviewSelect,
  type WorkspaceProjectSelect,
} from "@/service/drizzle/schema";

export interface WorkspaceProjectSnapshot {
  id: string;
  name: string;
  bookJobId?: string;
  analysisPurpose?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionSessionSnapshot {
  id: string;
  projectId?: string;
  createdAt: string;
  chapterTitle: string;
  genre: string;
  inputKind: string;
  textHash: string;
  textLength: number;
  quickScore: number | null;
  gateDecision: string;
  mainProblem: string;
  issueTitles: string[];
  issueCategories?: string[];
  nextPrompt?: string;
  revisionNote?: string;
  revisionNoteUpdatedAt?: string;
  fromVersionId?: string;
  toVersionId?: string;
  textChanged?: boolean;
  storyAuditFindingIds?: string[];
  methodologyCardIds: string[];
}

export interface RevisionTextVersionSnapshot {
  id: string;
  projectId?: string;
  createdAt: string;
  chapterTitle: string;
  versionLabel: string;
  textHash: string;
  textLength: number;
  text: string;
  sourceSessionId?: string;
  previousVersionId?: string;
}

export interface ProjectMethodologyCardSnapshot {
  id: string;
  projectCardId: string;
  projectId?: string;
  sourceIssueId: string;
  type: string;
  title: string;
  triggerProblem: string;
  reusableRule: string;
  selfCheckQuestion: string;
  promptTemplate?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceChapterTitle: string;
  sourceIssueTitle?: string;
  occurrenceCount: number;
  usageCount?: number;
}

export interface WorkspaceAssetsSnapshot {
  projects: WorkspaceProjectSnapshot[];
  revisionSessions: RevisionSessionSnapshot[];
  revisionVersions: RevisionTextVersionSnapshot[];
  methodologyCards: ProjectMethodologyCardSnapshot[];
}

export type StoryAuditFindingReviewState =
  | "unreviewed"
  | "confirmed"
  | "author_intent"
  | "insufficient_evidence"
  | "false_positive"
  | "planned"
  | "resolved";

export interface StoryAuditFindingReviewSnapshot {
  projectId: string;
  auditId: string;
  findingId: string;
  reviewState: StoryAuditFindingReviewState;
  note?: string;
  updatedAt: string;
}

@Injectable()
export class WorkspaceAssetsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async listAssets(): Promise<WorkspaceAssetsSnapshot> {
    const [projects, sessions, versions, cards] = await Promise.all([
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

  async readProjectPackage(projectId: string) {
    const [project] = await this.drizzle.db
      .select()
      .from(workspaceProjects)
      .where(eq(workspaceProjects.id, projectId))
      .limit(1);

    if (!project) {
      throw new NotFoundException(`Workspace project not found: ${projectId}`);
    }

    const [sessions, versions, cards] = await Promise.all([
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
    };
  }

  private async upsertRevisionTextVersion(
    version: RevisionTextVersionSnapshot,
    fallbackProjectId: string,
  ) {
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
