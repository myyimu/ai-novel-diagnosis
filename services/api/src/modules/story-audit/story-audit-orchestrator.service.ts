import { Injectable } from "@nestjs/common";
import {
  STORY_AUDIT_SCHEMA_VERSION,
  computeDialogueStatistics,
  type DialogueStatistics,
  type StoryAuditCoverage,
  type StoryAuditProfile,
  type StoryAuditResult,
  type StoryEvent,
  type StoryEvidenceAnchor,
  type StoryFact,
  type StoryFactKind,
  type StoryScene,
} from "@ai-novel-diagnosis/ai-core";
import type { ChapterSegment } from "../book/text-preprocessor.service";

/** Localized evidence anchor produced by the chapter map normalizer. */
export interface StoryAuditEvidenceAnchor {
  quote: string;
  startOffset: number;
  endOffset: number;
}

/** Atomic event extracted from one chapter's map. */
export interface StoryAuditChapterEvent {
  id: string;
  summary: string;
  participantIds: string[];
  locationIds: string[];
  absoluteTime?: string;
  relativeTimeText?: string;
  evidence: StoryAuditEvidenceAnchor[];
}

/** Atomic fact extracted from one chapter's map. */
export interface StoryAuditChapterFact {
  id: string;
  subjectId: string;
  predicate: string;
  object: string;
  kind: string;
  polarity: "asserted" | "negated" | "uncertain";
  sourcePriority: "author-canon" | "explicit-text" | "model-inference";
  confidence: number;
  evidence: StoryAuditEvidenceAnchor[];
}

/** Chapter map subset consumed by the orchestrator. */
export interface StoryAuditChapterMap {
  chapterId: string;
  order: number;
  title: string;
  storyExtractionAttempted?: boolean;
  storyEvents?: StoryAuditChapterEvent[];
  storyFacts?: StoryAuditChapterFact[];
}

export interface StoryAuditOrchestrationInput {
  /** Chapters with their normalized text still available. */
  chapters: ChapterSegment[];
  /** Atomic events/facts extracted from visible chapters only. */
  chapterMaps?: StoryAuditChapterMap[];
  purpose: "own-draft" | "reference-study";
  profiles: string[];
  bookJobId: string;
  projectId?: string;
}

const STORY_FACT_KINDS: ReadonlyArray<StoryFactKind> = [
  "identity",
  "appearance",
  "age",
  "ability",
  "knowledge",
  "goal",
  "belief",
  "relationship",
  "location",
  "possession",
  "injury",
  "world_rule",
];

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function sanitizeFactKind(value: string): StoryFactKind {
  return (STORY_FACT_KINDS as ReadonlyArray<string>).includes(value)
    ? (value as StoryFactKind)
    : "identity";
}

function hasProfile(
  profiles: ReadonlySet<string>,
  ...targets: StoryAuditProfile[]
): boolean {
  return profiles.has("full") || targets.some((target) => profiles.has(target));
}

function extractionWasAttempted(map: StoryAuditChapterMap): boolean {
  return (
    map.storyExtractionAttempted === true ||
    map.storyEvents !== undefined ||
    map.storyFacts !== undefined
  );
}

/**
 * Derives the story audit layer from the existing whole-book Map-Reduce
 * artifacts and embeds it into `BookAnalysisResult.storyAudit`.
 *
 * First-version scope: deterministic coverage + dialogue statistics plus the
 * atomic events/facts harvested from visible chapter maps. Arcs, findings and
 * derived views come in later SIA tasks. The orchestrator applies the requested
 * profiles, rejects maps outside the supplied chapters and validates every
 * text anchor again before publishing it.
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

    const profiles = new Set(input.profiles);
    const statisticsEnabled = hasProfile(profiles, "statistics");
    const storyExtractionEnabled = hasProfile(
      profiles,
      "continuity",
      "structure",
      "character",
    );
    const chapterById = new Map(
      chapters.map((chapter) => [chapter.id, chapter]),
    );
    const seenChapterIds = new Set<string>();
    const extractedMaps = storyExtractionEnabled
      ? (input.chapterMaps ?? [])
          .filter((map) => {
            if (
              seenChapterIds.has(map.chapterId) ||
              !chapterById.has(map.chapterId) ||
              !extractionWasAttempted(map)
            ) {
              return false;
            }
            seenChapterIds.add(map.chapterId);
            return true;
          })
          .sort(
            (left, right) =>
              chapterById.get(left.chapterId)!.order -
              chapterById.get(right.chapterId)!.order,
          )
      : [];

    const dialogue: DialogueStatistics[] = statisticsEnabled
      ? chapters.map((chapter) =>
          computeDialogueStatistics(chapter.text, { scopeId: chapter.id }),
        )
      : [];

    const scenes: StoryScene[] = extractedMaps.map((map) => {
      const chapter = chapterById.get(map.chapterId)!;
      const events = map.storyEvents ?? [];
      return {
        id: `scene-${chapter.id}`,
        chapterId: chapter.id,
        orderInChapter: 1,
        narrativeOrder: chapter.order,
        title: map.title || chapter.title,
        locationIds: uniqueStrings(
          events.flatMap((event) => event.locationIds),
        ),
        participantIds: uniqueStrings(
          events.flatMap((event) => event.participantIds),
        ),
        evidence: [],
      };
    });

    const events: StoryEvent[] = extractedMaps.flatMap((map) => {
      const chapter = chapterById.get(map.chapterId)!;
      return (map.storyEvents ?? []).map((event, index) => {
        const id = `evt-${map.chapterId}-${index + 1}`;
        return {
          id,
          sceneId: `scene-${map.chapterId}`,
          summary: event.summary,
          participantIds: uniqueStrings(event.participantIds),
          locationIds: uniqueStrings(event.locationIds),
          ...(event.absoluteTime ? { absoluteTime: event.absoluteTime } : {}),
          ...(event.relativeTimeText
            ? { relativeTimeText: event.relativeTimeText }
            : {}),
          relations: [],
          evidence: this.toAnchors(event.evidence, id, chapter, "text"),
        };
      });
    });

    const facts: StoryFact[] = extractedMaps.flatMap((map) => {
      const chapter = chapterById.get(map.chapterId)!;
      return (map.storyFacts ?? []).flatMap((fact, index) => {
        const id = `fct-${map.chapterId}-${index + 1}`;
        const source =
          fact.sourcePriority === "author-canon" ? "author-canon" : "text";
        const evidence = this.toAnchors(fact.evidence, id, chapter, source);
        if (fact.sourcePriority === "explicit-text" && evidence.length === 0) {
          return [];
        }
        return [
          {
            id,
            subjectId: fact.subjectId,
            predicate: fact.predicate,
            object: fact.object,
            kind: sanitizeFactKind(fact.kind),
            polarity: fact.polarity,
            sourcePriority: fact.sourcePriority,
            confidence: fact.confidence,
            evidence,
          },
        ];
      });
    });

    const attemptedEvidenceCount = extractedMaps.reduce(
      (total, map) =>
        total +
        (map.storyEvents ?? []).reduce(
          (eventTotal, event) => eventTotal + event.evidence.length,
          0,
        ) +
        (map.storyFacts ?? []).reduce(
          (factTotal, fact) => factTotal + fact.evidence.length,
          0,
        ),
      0,
    );
    const validatedEvidenceCount =
      events.reduce((total, event) => total + event.evidence.length, 0) +
      facts.reduce((total, fact) => total + fact.evidence.length, 0);
    const evidenceValidationRate =
      attemptedEvidenceCount === 0
        ? 0
        : validatedEvidenceCount / attemptedEvidenceCount;

    const analyzedChapterIds = storyExtractionEnabled
      ? extractedMaps.map((map) => map.chapterId)
      : statisticsEnabled
        ? chapters.map((chapter) => chapter.id)
        : [];

    const coverage: StoryAuditCoverage = {
      analyzedChapterIds,
      totalChapterCount: chapters.length,
      isPartial: analyzedChapterIds.length < chapters.length,
      sceneExtractionRate: storyExtractionEnabled
        ? scenes.length / chapters.length
        : 0,
      evidenceValidationRate,
    };

    return {
      schemaVersion: STORY_AUDIT_SCHEMA_VERSION,
      auditId: `audit-${input.bookJobId}`,
      projectId: input.projectId ?? input.bookJobId,
      bookJobId: input.bookJobId,
      generatedAt: new Date().toISOString(),
      coverage,
      scenes,
      events,
      facts,
      characterStates: [],
      findings: [],
      metrics: { dialogue },
      views: { plotlineMatrix: [], setupPayoffEdges: [] },
    };
  }

  private toAnchors(
    evidence: StoryAuditEvidenceAnchor[],
    ownerId: string,
    chapter: ChapterSegment,
    source: StoryEvidenceAnchor["source"],
  ): StoryEvidenceAnchor[] {
    return evidence.flatMap((anchor, index) => {
      const localStart = anchor.startOffset - chapter.startOffset;
      const localEnd = anchor.endOffset - chapter.startOffset;
      const isValid =
        anchor.quote.length > 0 &&
        Number.isInteger(anchor.startOffset) &&
        Number.isInteger(anchor.endOffset) &&
        localStart >= 0 &&
        localEnd > localStart &&
        localEnd <= chapter.text.length &&
        chapter.text.slice(localStart, localEnd) === anchor.quote;
      if (!isValid) {
        return [];
      }
      return [
        {
          anchorId: `${ownerId}-a${index + 1}`,
          chapterId: chapter.id,
          chapterOrder: chapter.order,
          quote: anchor.quote,
          startOffset: anchor.startOffset,
          endOffset: anchor.endOffset,
          source,
        },
      ];
    });
  }
}
