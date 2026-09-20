import type { ChapterGuidanceMode } from "./chapter-guidance";

/** A revision route in a chapter comparison. */
export type ChapterRevisionRoute = "baseline" | "guided";

/** Frozen author intent shared by both revision routes. */
export interface ChapterExperimentBrief {
  chapterTitle: string;
  originalText: string;
  goal: string;
  preserve: string;
  context: string;
  /** Optional diagnosis hypotheses; only the guidance route receives them. */
  diagnosis?: string;
}

/** One persisted exchange; quotations are checked against the original chapter. */
export interface ChapterGuidanceTurn {
  /** Requested mode; absent on legacy exchanges, which used automatic guidance. */
  mode?: ChapterGuidanceMode;
  message: string;
  reply: string;
  quote: string;
  /** May be empty while the author is still exploring their intent. */
  suggestedPlan: string;
  elapsedMs: number;
}

/** Immutable generated manuscript; parentId preserves each route's lineage. */
export interface ChapterExperimentVersion {
  id: string;
  route: ChapterRevisionRoute;
  round: number;
  parentId: string;
  text: string;
  createdAt: string;
  elapsedMs: number;
  modelLabel: string;
}

/** Human reading decision, including ties and inconclusive comparisons. */
export interface ChapterReadingDecision {
  leftId: string;
  rightId: string;
  choice: "left" | "right" | "tie" | "uncertain";
  reason: string;
  createdAt: string;
}

/** Durable chapter experiment. No credentials or model quality scores are stored. */
export interface ChapterExperiment extends ChapterExperimentBrief {
  id: string;
  projectId: string;
  revision: number;
  createdAt: string;
  turns: ChapterGuidanceTurn[];
  plan: string | null;
  writerFingerprint: string | null;
  versions: ChapterExperimentVersion[];
  decisions: ChapterReadingDecision[];
}

/** Lightweight experiment selector entry. */
export interface ChapterExperimentSummary {
  id: string;
  chapterTitle: string;
  goal: string;
  createdAt: string;
}

/** Resolve an immutable text by ID, including the frozen original. */
export function chapterExperimentText(
  experiment: ChapterExperiment,
  id: string,
): string | undefined {
  return id === "original"
    ? experiment.originalText
    : experiment.versions.find((v) => v.id === id)?.text;
}

/** Select the last version in one route, never another route's output.
 * @example nextChapterRevision(experiment, "guided") // { round: 1, parentId: "original", text: ... }
 */
export function nextChapterRevision(
  experiment: ChapterExperiment,
  route: ChapterRevisionRoute,
): { round: number; parentId: string; text: string } | null {
  const versions = experiment.versions.filter((version) => version.route === route);
  if (versions.length >= 2) return null;
  const previous = versions[versions.length - 1];
  return {
    round: versions.length + 1,
    parentId: previous?.id ?? "original",
    text: previous?.text ?? experiment.originalText,
  };
}
