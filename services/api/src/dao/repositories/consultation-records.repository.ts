import { Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import type {
  PremiseConsultResult,
  PremiseConsultTrigger,
  PremiseVerdictRelation,
  ReportDivergenceResult,
} from "@ai-novel-diagnosis/ai-core";
import { DrizzleService } from "@/service/drizzle/drizzle.service";
import {
  premiseConsults,
  reportDivergences,
  type PremiseConsultRecordSelect,
  type ReportDivergenceRecordSelect,
} from "@/service/drizzle/schema";

/** Typed view of one persisted premise consultation. */
export interface PremiseConsultRecord {
  id: string;
  projectId: string;
  trigger: PremiseConsultTrigger;
  mode: "mock" | "model";
  verdictRelation: PremiseVerdictRelation;
  result: PremiseConsultResult;
  createdAt: Date;
  updatedAt: Date;
}

/** Typed view of one persisted report-divergence detection. */
export interface ReportDivergenceRecord {
  id: string;
  projectId: string;
  chapterTitle: string;
  mode: "mock" | "model";
  divergenceCount: number;
  result: ReportDivergenceResult;
  authorNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persistence for T4 consultation records: premise consults and report
 * divergences. Only real-model runs are written here — demo-mode placeholders
 * never enter the medical record. The stored jsonb is the exact result the
 * author saw (both sides + the code-computed comparison), so the record can
 * never diverge from what was presented.
 */
@Injectable()
export class ConsultationRecordsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async insertPremiseConsult(data: {
    projectId: string;
    result: PremiseConsultResult;
  }): Promise<PremiseConsultRecord> {
    const now = new Date();
    const [row] = await this.drizzle.db
      .insert(premiseConsults)
      .values({
        id: data.result.consultId,
        projectId: data.projectId,
        trigger: data.result.trigger,
        mode: data.result.mode,
        verdictRelation: data.result.comparison.verdictRelation,
        result: data.result,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return this.toPremiseConsultRecord(row);
  }

  async listPremiseConsultsByProject(
    projectId: string,
  ): Promise<PremiseConsultRecord[]> {
    const rows = await this.drizzle.db
      .select()
      .from(premiseConsults)
      .where(eq(premiseConsults.projectId, projectId))
      .orderBy(desc(premiseConsults.createdAt));
    return rows.map((row) => this.toPremiseConsultRecord(row));
  }

  async insertReportDivergence(data: {
    projectId: string;
    result: ReportDivergenceResult;
  }): Promise<ReportDivergenceRecord> {
    const now = new Date();
    const [row] = await this.drizzle.db
      .insert(reportDivergences)
      .values({
        id: data.result.divergenceId,
        projectId: data.projectId,
        chapterTitle: data.result.chapterTitle,
        mode: data.result.mode,
        divergenceCount: data.result.divergences.length,
        result: data.result,
        authorNote: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return this.toReportDivergenceRecord(row);
  }

  async listReportDivergencesByProject(
    projectId: string,
  ): Promise<ReportDivergenceRecord[]> {
    const rows = await this.drizzle.db
      .select()
      .from(reportDivergences)
      .where(eq(reportDivergences.projectId, projectId))
      .orderBy(desc(reportDivergences.createdAt));
    return rows.map((row) => this.toReportDivergenceRecord(row));
  }

  /** Persist the author's adjudication note on one divergence record. */
  async updateReportDivergenceNote(
    id: string,
    note: string,
  ): Promise<ReportDivergenceRecord | null> {
    const [row] = await this.drizzle.db
      .update(reportDivergences)
      .set({ authorNote: note, updatedAt: new Date() })
      .where(eq(reportDivergences.id, id))
      .returning();
    return row ? this.toReportDivergenceRecord(row) : null;
  }

  private toPremiseConsultRecord(
    row: PremiseConsultRecordSelect,
  ): PremiseConsultRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      trigger: row.trigger as PremiseConsultTrigger,
      mode: row.mode as "mock" | "model",
      verdictRelation: row.verdictRelation as PremiseVerdictRelation,
      result: row.result as PremiseConsultResult,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toReportDivergenceRecord(
    row: ReportDivergenceRecordSelect,
  ): ReportDivergenceRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      chapterTitle: row.chapterTitle,
      mode: row.mode as "mock" | "model",
      divergenceCount: row.divergenceCount,
      result: row.result as ReportDivergenceResult,
      authorNote: row.authorNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
