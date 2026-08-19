import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type {
  PremiseAuthorContract,
  PremiseContractFields,
  PremiseDialogueContractReviewOutput,
  PremiseDialogueSessionState,
  PremiseDialogueSessionStatus,
  PremiseDialogueTurnRecord,
  PremiseLayerAssessment,
} from "@ai-novel-diagnosis/ai-core";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import {
  premiseDialogueSessions,
  type PremiseDialogueSessionSelect,
} from "@/service/drizzle/schema";

/** Typed view of one persisted dialogue session (jsonb payloads narrowed here). */
export interface PremiseDialogueSessionRecord {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  /** The review's layer assessments — the orchestration input (frozen at start). */
  layers: PremiseLayerAssessment[];
  /** The editor contract restated by the review (frozen at start). */
  editorContract: PremiseContractFields;
  /** The dialogue state proper: premise text, turns, status, author contract. */
  session: PremiseDialogueSessionState;
}

/** Payload for session creation; ids and timestamps are the repository's job. */
export interface CreatePremiseDialogueSessionData {
  id: string;
  layers: PremiseLayerAssessment[];
  editorContract: PremiseContractFields;
  session: PremiseDialogueSessionState;
}

/** Mutable slice — every update stamps updatedAt. */
export interface UpdatePremiseDialogueSessionData {
  turns?: PremiseDialogueTurnRecord[];
  status?: PremiseDialogueSessionStatus;
  authorContract?: PremiseAuthorContract | null;
  contractReview?: (PremiseDialogueContractReviewOutput & { droppedPointCount?: number }) | null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord<T>(value: unknown): T {
  return value as T;
}

@Injectable()
export class PremiseDialogueRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async createSession(
    data: CreatePremiseDialogueSessionData,
  ): Promise<PremiseDialogueSessionRecord> {
    const now = new Date();
    const [row] = await this.drizzle
      .db.insert(premiseDialogueSessions)
      .values({
        id: data.id,
        projectId: data.session.projectId,
        reviewId: data.session.reviewId,
        genre: data.session.genre ?? null,
        premiseText: data.session.premiseText,
        layersState: data.layers,
        editorContract: data.editorContract,
        turns: data.session.turns,
        status: data.session.status,
        authorContract: null,
        contractReview: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return this.toRecord(row);
  }

  async findById(id: string): Promise<PremiseDialogueSessionRecord | null> {
    const [row] = await this.drizzle
      .db.select()
      .from(premiseDialogueSessions)
      .where(eq(premiseDialogueSessions.id, id))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async update(
    id: string,
    patch: UpdatePremiseDialogueSessionData,
  ): Promise<PremiseDialogueSessionRecord | null> {
    const [row] = await this.drizzle
      .db.update(premiseDialogueSessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(premiseDialogueSessions.id, id))
      .returning();
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: PremiseDialogueSessionSelect): PremiseDialogueSessionRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      layers: asArray<PremiseLayerAssessment>(row.layersState),
      editorContract: asRecord<PremiseContractFields>(row.editorContract),
      session: {
        schemaVersion: "premise-dialogue.v1",
        projectId: row.projectId,
        reviewId: row.reviewId,
        genre: row.genre ?? undefined,
        premiseText: row.premiseText,
        turns: asArray<PremiseDialogueTurnRecord>(row.turns),
        status: row.status as PremiseDialogueSessionStatus,
        authorContract: row.authorContract
          ? asRecord<PremiseAuthorContract>(row.authorContract)
          : undefined,
        contractReview: row.contractReview
          ? asRecord<PremiseDialogueContractReviewOutput & { droppedPointCount?: number }>(
              row.contractReview,
            )
          : undefined,
      },
    };
  }
}
