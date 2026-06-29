import type { BookSkillSource } from "./book-skill-compiler";

/**
 * Cross-sample aggregator for book-distilled skills (L3 of the skill pipeline).
 *
 * Algorithm: B1 (strict intersection above threshold) + B2 (frequency-ranked)
 * combined. Identity-bound items (referenceBoundaryCheck.doNotReuse) are NEVER
 * aggregated -- they stay per-source so each contributing book can be cited
 * individually.
 *
 * No LLM call inside this function. All deduplication is exact-string match;
 * fuzzy clustering is a future enhancement.
 */

export type SkillGroupBy = "author" | "genre" | "platform";

export interface AggregateOptions {
  groupBy: SkillGroupBy;
  groupValue: string;
}

/** One contributing source book, kept lightweight for provenance. */
export interface AggregatedSource {
  jobId: string;
  title: string;
  author?: string;
  platform?: string;
  publishedYear?: number;
}

/** A rule (or pattern / mechanism) that appeared in at least one source. */
export interface AggregatedItem {
  text: string;
  occurrences: number;
  /** Job ids of contributing sources, in stable order. */
  sourceJobIds: string[];
}

/** A per-source identity item that must NOT be cross-cited. */
export interface PerSourceItem {
  text: string;
  sourceJobId: string;
  sourceTitle: string;
}

export interface DistilledSkillData {
  groupBy: SkillGroupBy;
  groupValue: string;
  /** ISO 8601 timestamp; passed in by caller so this function stays pure. */
  generatedAt: string;
  sampleSize: number;
  /** Sources contributing to the aggregation (deduped, ordered by jobId). */
  sources: AggregatedSource[];
  /** K/N threshold actually used. */
  intersectionThreshold: number;
  /** Confidence label derived from sample size. */
  confidence: "low" | "medium-low" | "medium" | "high";

  // --- Aggregated lists ---

  /** B1 output: items present in >= threshold sources. */
  highConfidenceStyleRules: AggregatedItem[];
  /** B2 output: every style/prose rule, ranked by occurrence count desc. */
  rankedStyleRules: AggregatedItem[];
  /** Single-source rules, kept separately so we can label them visibly. */
  singleSourceStyleRules: PerSourceItem[];

  pleasureMechanisms: AggregatedItem[];
  hookPatterns: AggregatedItem[];
  antiPatterns: AggregatedItem[];
  toneKeywords: AggregatedItem[];

  /** Per-source identity items -- never aggregated. */
  perSourceDoNotReuse: PerSourceItem[];
  perSourceNeedsTransformation: PerSourceItem[];

  // --- Debug surface for tuning ---
  debug: {
    inputJobIds: string[];
    droppedEmpty: string[]; // jobIds skipped because they had no style fields at all
  };
}

/**
 * Decide how many sources must agree before a rule earns "high confidence".
 * Calibrated to give meaningful overlap at small N without producing empty
 * intersections.
 */
export function intersectionThresholdFor(sampleSize: number): number {
  if (sampleSize <= 1) return 1;
  if (sampleSize <= 4) return 2;
  if (sampleSize <= 9) return 3;
  return Math.max(3, Math.ceil(sampleSize * 0.4));
}

function confidenceFor(sampleSize: number): DistilledSkillData["confidence"] {
  if (sampleSize <= 1) return "low";
  if (sampleSize <= 4) return "medium-low";
  if (sampleSize <= 9) return "medium";
  return "high";
}

function normalizeRule(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[。；！？.;!?]+$/u, "");
}

/** Index every rule across all sources, building a freq map plus origin index. */
function indexItems(
  sources: BookSkillSource[],
  extract: (s: BookSkillSource) => string[] | undefined,
): { freq: Map<string, Set<string>>; firstSeen: Map<string, string> } {
  const freq = new Map<string, Set<string>>();
  const firstSeen = new Map<string, string>();
  for (const source of sources) {
    const values = extract(source) || [];
    for (const raw of values) {
      if (typeof raw !== "string") continue;
      const normalized = normalizeRule(raw);
      if (!normalized) continue;
      if (!freq.has(normalized)) {
        freq.set(normalized, new Set());
        firstSeen.set(normalized, source.jobId);
      }
      freq.get(normalized)!.add(source.jobId);
    }
  }
  return { freq, firstSeen };
}

function aggregatedFromFreq(freq: Map<string, Set<string>>): AggregatedItem[] {
  return [...freq.entries()]
    .map(([text, jobIds]) => ({
      text,
      occurrences: jobIds.size,
      sourceJobIds: [...jobIds].sort(),
    }))
    .sort((a, b) =>
      b.occurrences === a.occurrences
        ? a.text.localeCompare(b.text)
        : b.occurrences - a.occurrences,
    );
}

function perSourceFromFreq(
  freq: Map<string, Set<string>>,
  sourcesById: Map<string, BookSkillSource>,
): PerSourceItem[] {
  return [...freq.entries()]
    .filter(([, jobIds]) => jobIds.size === 1)
    .map(([text, jobIds]) => {
      const sourceJobId = [...jobIds][0]!;
      return {
        text,
        sourceJobId,
        sourceTitle: sourcesById.get(sourceJobId)?.title || sourceJobId,
      };
    })
    .sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle));
}

function hasAnyStyleSignal(source: BookSkillSource): boolean {
  const c = source.styleCard;
  const b = source.styleBible;
  return Boolean(
    c?.styleRules?.length ||
    c?.antiPatterns?.length ||
    c?.pleasureMechanisms?.length ||
    c?.hookPatterns?.length ||
    c?.coreStyleTags?.length ||
    c?.narrativeVoice ||
    c?.sentenceRhythm ||
    b?.proseRules?.length ||
    b?.tabooList?.length ||
    b?.toneKeywords?.length,
  );
}

export interface AggregateBookSkillsInput {
  sources: BookSkillSource[];
  options: AggregateOptions;
  generatedAt: string;
}

/**
 * Aggregate N book-skill sources into one DistilledSkillData snapshot.
 *
 * Pure function; deterministic given the same inputs and ordering.
 */
export function aggregateBookSkills(
  input: AggregateBookSkillsInput,
): DistilledSkillData {
  // Drop sources that have literally no style signal -- they cannot contribute.
  const droppedEmpty: string[] = [];
  const usable: BookSkillSource[] = [];
  for (const source of input.sources) {
    if (hasAnyStyleSignal(source)) {
      usable.push(source);
    } else {
      droppedEmpty.push(source.jobId);
    }
  }

  const sampleSize = usable.length;
  const threshold = intersectionThresholdFor(sampleSize);
  const sourcesById = new Map(usable.map((source) => [source.jobId, source]));

  // Style rules combine multiple fields so the intersection has a real chance
  // at meaningful overlap; prose rules and dialogue rules are still rules.
  const styleFreq = indexItems(usable, (s) => [
    ...(s.styleCard?.styleRules ?? []),
    ...(s.styleBible?.proseRules ?? []),
    ...(s.styleBible?.dialogueRules ?? []),
  ]).freq;

  const pleasureFreq = indexItems(
    usable,
    (s) => s.styleCard?.pleasureMechanisms,
  ).freq;
  const hookFreq = indexItems(usable, (s) => s.styleCard?.hookPatterns).freq;
  const antiFreq = indexItems(usable, (s) => [
    ...(s.styleCard?.antiPatterns ?? []),
    ...(s.styleBible?.tabooList ?? []),
  ]).freq;
  const toneFreq = indexItems(usable, (s) => s.styleBible?.toneKeywords).freq;

  const allRanked = aggregatedFromFreq(styleFreq);
  const highConfidence = allRanked.filter(
    (item) => item.occurrences >= threshold,
  );
  const singleSource = perSourceFromFreq(styleFreq, sourcesById);

  const perSourceDoNotReuse: PerSourceItem[] = usable.flatMap((source) =>
    (source.boundary?.doNotReuse ?? [])
      .map((raw) => normalizeRule(raw))
      .filter(Boolean)
      .map((text) => ({
        text,
        sourceJobId: source.jobId,
        sourceTitle: source.title,
      })),
  );

  const perSourceNeedsTransformation: PerSourceItem[] = usable.flatMap(
    (source) =>
      (source.boundary?.needsTransformation ?? [])
        .map((raw) => normalizeRule(raw))
        .filter(Boolean)
        .map((text) => ({
          text,
          sourceJobId: source.jobId,
          sourceTitle: source.title,
        })),
  );

  const sources: AggregatedSource[] = usable.map((source) => {
    const meta = source.metadata || {};
    return {
      jobId: source.jobId,
      title: source.title,
      ...(meta.author ? { author: meta.author } : {}),
      ...(meta.platform ? { platform: meta.platform } : {}),
      ...(meta.publishedYear !== undefined
        ? { publishedYear: meta.publishedYear }
        : {}),
    };
  });

  return {
    groupBy: input.options.groupBy,
    groupValue: input.options.groupValue,
    generatedAt: input.generatedAt,
    sampleSize,
    sources,
    intersectionThreshold: threshold,
    confidence: confidenceFor(sampleSize),
    highConfidenceStyleRules: highConfidence,
    rankedStyleRules: allRanked,
    singleSourceStyleRules: singleSource,
    pleasureMechanisms: aggregatedFromFreq(pleasureFreq),
    hookPatterns: aggregatedFromFreq(hookFreq),
    antiPatterns: aggregatedFromFreq(antiFreq),
    toneKeywords: aggregatedFromFreq(toneFreq),
    perSourceDoNotReuse,
    perSourceNeedsTransformation,
    debug: {
      inputJobIds: input.sources.map((s) => s.jobId),
      droppedEmpty,
    },
  };
}
