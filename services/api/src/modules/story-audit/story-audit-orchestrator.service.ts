import { Injectable } from "@nestjs/common";
import {
  STORY_AUDIT_SCHEMA_VERSION,
  computeDialogueStatistics,
  type DialogueStatistics,
  type StoryAuditCoverage,
  type StoryAuditResult,
} from "@ai-novel-diagnosis/ai-core";
import type { ChapterSegment } from "../book/text-preprocessor.service";

export interface StoryAuditOrchestrationInput {
  /**
   * Chapters with their normalized text still available. Dialogue statistics
   * are computed deterministically from this text — no model, no IO.
   */
  chapters: ChapterSegment[];
  purpose: "own-draft" | "reference-study";
  profiles: string[];
  bookJobId: string;
  projectId?: string;
}

/**
 * Derives the story audit layer from the existing whole-book Map-Reduce
 * artifacts and embeds it into `BookAnalysisResult.storyAudit`.
 *
 * The first version intentionally produces only deterministic coverage and
 * dialogue statistics — scenes, events, facts, findings and views come in
 * later SIA tasks. It is pure code, so a model failure elsewhere never blocks
 * it, and it returns `null` for reference studies so the existing research
 * flow stays untouched.
 */
@Injectable()
export class StoryAuditOrchestratorService {
  generateStoryAudit(
    input: StoryAuditOrchestrationInput,
  ): StoryAuditResult | null {
    if (input.purpose !== "own-draft") {
      return null;
    }
    const chapters = input.chapters;
    if (chapters.length === 0) {
      return null;
    }

    const dialogue: DialogueStatistics[] = chapters.map((chapter) =>
      computeDialogueStatistics(chapter.text, { scopeId: chapter.id }),
    );

    const coverage: StoryAuditCoverage = {
      analyzedChapterIds: chapters.map((chapter) => chapter.id),
      totalChapterCount: chapters.length,
      isPartial: false,
      sceneExtractionRate: 0,
      evidenceValidationRate: 0,
    };

    return {
      schemaVersion: STORY_AUDIT_SCHEMA_VERSION,
      auditId: `audit-${input.bookJobId}`,
      projectId: input.projectId ?? input.bookJobId,
      bookJobId: input.bookJobId,
      generatedAt: new Date().toISOString(),
      coverage,
      scenes: [],
      events: [],
      facts: [],
      characterStates: [],
      findings: [],
      metrics: { dialogue },
      views: { plotlineMatrix: [], setupPayoffEdges: [] },
    };
  }
}
