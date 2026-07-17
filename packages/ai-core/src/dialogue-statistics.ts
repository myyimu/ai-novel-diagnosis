/**
 * Deterministic dialogue statistics — no model, no IO.
 *
 * Runs after text normalization and before any model call. The parser emits
 * token spans (not just final ratios) so the UI can click back into the source
 * text and handle nested quotes.
 *
 * Supported quote styles:
 * - `curly`         — “ ”  (U+201C / U+201D), the most common Chinese style
 * - `corner`        — 「 」  (U+300C / U+300D)
 * - `double-corner` — 『 』  (U+300E / U+300F)
 * - `ascii`         — " "   (U+0022, same glyph for open and close)
 *
 * Nesting is handled by a single active-quote state machine: while inside a
 * dialogue span, any other quote glyph (including a different style's opener)
 * is treated as dialogue content, so an inner quote cannot terminate the outer
 * one. An unclosed quote produces a parser warning and the span runs to the
 * end of the text instead of silently swallowing the remainder.
 *
 * @example
 * const stats = computeDialogueStatistics("他说：“你来了。”", { scopeId: "ch1" });
 * // stats.dialogueCharacterRatio > 0
 */

import type { DialogueStatistics } from "./story-audit";

/** Recognized dialogue quote styles. */
export type DialogueQuoteStyle = "curly" | "corner" | "double-corner" | "ascii";

/** Content kinds that may be excluded from dialogue even when quoted. */
export type DialogueExcludeKind = "message" | "letter" | "system" | "inner-monologue";

/** An open/close glyph pair for one quote style. */
export interface DialogueQuotePair {
  style: DialogueQuoteStyle;
  open: string;
  close: string;
}

/** Quote styles enabled by default. Curly + corner cover most Chinese novels. */
export const DEFAULT_DIALOGUE_QUOTE_STYLES: ReadonlyArray<DialogueQuoteStyle> = [
  "curly",
  "corner",
  "double-corner",
  "ascii",
];

/** Glyph table for every supported quote style. */
export const DIALOGUE_QUOTE_PAIRS: Record<DialogueQuotePair["style"], DialogueQuotePair> = {
  curly: { style: "curly", open: "“", close: "”" },
  corner: { style: "corner", open: "「", close: "」" },
  "double-corner": { style: "double-corner", open: "『", close: "』" },
  ascii: { style: "ascii", open: '"', close: '"' },
};

/**
 * A located dialogue span. `start` is the open glyph index; `end` is the index
 * after the close glyph (or the text length when unclosed). Content offsets —
 * excluding the glyphs themselves — are `[start + 1, closed ? end - 1 : end)`.
 */
export interface DialogueSpan {
  style: DialogueQuoteStyle;
  start: number;
  end: number;
  closed: boolean;
  excludedKind?: DialogueExcludeKind;
}

/** Options for {@link computeDialogueStatistics}. */
export interface ComputeDialogueStatisticsOptions {
  scopeId: string;
  quoteStyles?: ReadonlyArray<DialogueQuoteStyle>;
  excludeKinds?: ReadonlyArray<DialogueExcludeKind>;
}

/** Verbs that attribute a line of dialogue to a speaker, longest-first. */
const DIALOGUE_TAG_TERMS: ReadonlyArray<string> = [
  "冷笑道",
  "怒声道",
  "低声道",
  "轻声道",
  "微笑道",
  "嘀嘀咕咕",
  "嘀咕着",
  "嘟嘟囔囔",
  "说道",
  "问道",
  "喊道",
  "叫道",
  "答道",
  "笑道",
  "叹道",
  "应道",
  "回道",
  "驳道",
  "吼道",
  "怒道",
  "嘀咕",
  "嘟囔",
  "吼叫",
  "说",
  "问",
  "喊",
  "叫",
  "答",
  "笑",
  "叹",
  "应",
  "回",
  "驳",
];

/**
 * Conservative content patterns for excludable kinds. These only match content
 * carrying an explicit marker, so ordinary dialogue is never dropped by
 * accident. The default configuration excludes nothing.
 */
const EXCLUDE_PATTERNS: Record<DialogueExcludeKind, RegExp> = {
  system: /(^|\s)【[^】]*[：:][^】]*】|^【[^】]{0,12}】/,
  message: /(^|\s)(短信|消息|微信|电话|语音|通讯)[:：]|^(发件人|收件人|来自)[:：]/,
  letter: /(亲爱的[\s\S]{0,8}|此致敬礼|此致\s*敬礼|敬启者|敬上\s*$|来信[:：]|去信[:：])/,
  "inner-monologue": /(我心想|她心想|他心想|心想道|暗想道|暗自思忖|心里嘀咕|暗道[:：]|心想[:：])/,
};

const PARAGRAPH_SEPARATOR = /\r\n|\r|\n/;
const INSIGNIFICANT_BETWEEN_TURNS = /^[\s，。！？、…—\-·]*$/;
const TAG_WINDOW = 8;
const MAX_ADJACENT_TURN_GAP = 24;
const TAG_PUNCTUATION = "：:，。！？、…—\\s";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch);
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value > 1 ? 1 : value;
}

/**
 * Scan the text and return every dialogue span in source order, plus parser
 * warnings for unmatched close quotes and unclosed open quotes.
 *
 * @example
 * const { spans, warnings } = extractDialogueSpans("“你好”", ["curly"]);
 */
export function extractDialogueSpans(
  text: string,
  quoteStyles: ReadonlyArray<DialogueQuoteStyle> = DEFAULT_DIALOGUE_QUOTE_STYLES,
): { spans: DialogueSpan[]; warnings: string[] } {
  const enabledStyles = quoteStyles.length > 0 ? quoteStyles : DEFAULT_DIALOGUE_QUOTE_STYLES;
  const openMap = new Map<string, DialogueQuotePair>();
  const closeMap = new Map<string, DialogueQuotePair>();
  for (const style of enabledStyles) {
    const pair = DIALOGUE_QUOTE_PAIRS[style];
    openMap.set(pair.open, pair);
    closeMap.set(pair.close, pair);
  }

  const spans: DialogueSpan[] = [];
  const warnings: string[] = [];
  let active: DialogueQuotePair | null = null;
  let startIndex = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (active === null) {
      const opener = openMap.get(ch);
      if (opener !== undefined) {
        active = opener;
        startIndex = i;
      } else if (closeMap.has(ch)) {
        warnings.push(`未匹配的闭引号位于 offset ${i}（${ch}）`);
      }
    } else if (ch === active.close) {
      spans.push({ style: active.style, start: startIndex, end: i + 1, closed: true });
      active = null;
    }
  }

  if (active !== null) {
    spans.push({
      style: active.style,
      start: startIndex,
      end: text.length,
      closed: false,
    });
    warnings.push(`未闭合的 ${active.style} 引号开始于 offset ${startIndex}`);
  }

  return { spans, warnings };
}

function classifyExclusion(
  content: string,
  excludeKinds: ReadonlyArray<DialogueExcludeKind>,
): DialogueExcludeKind | undefined {
  for (const kind of excludeKinds) {
    if (EXCLUDE_PATTERNS[kind].test(content)) {
      return kind;
    }
  }
  return undefined;
}

function contentSlice(text: string, span: DialogueSpan): string {
  const start = span.start + 1;
  const end = span.closed ? span.end - 1 : span.end;
  return start >= end ? "" : text.slice(start, end);
}

function countSignificant(slice: string): number {
  let count = 0;
  for (const ch of slice) {
    if (!isWhitespace(ch)) {
      count += 1;
    }
  }
  return count;
}

function findTagNearSpan(text: string, span: DialogueSpan): boolean {
  const beforeStart = Math.max(0, span.start - TAG_WINDOW);
  const beforeWindow = text.slice(beforeStart, span.start);
  const afterWindow = text.slice(span.end, span.end + TAG_WINDOW);
  for (const term of DIALOGUE_TAG_TERMS) {
    const escaped = escapeRegex(term);
    if (new RegExp(`${escaped}[${TAG_PUNCTUATION}]*$`).test(beforeWindow)) {
      return true;
    }
    if (new RegExp(`^[${TAG_PUNCTUATION}]*[\\u4e00-\\u9fa5]{0,3}${escaped}`).test(afterWindow)) {
      return true;
    }
  }
  return false;
}

function splitParagraphs(text: string): Array<{ start: number; end: number }> {
  const paragraphs: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  const lines = text.split(PARAGRAPH_SEPARATOR);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().length > 0) {
      paragraphs.push({ start: cursor, end: cursor + line.length });
    }
    cursor += line.length + 1;
  }
  return paragraphs;
}

/**
 * Compute deterministic dialogue statistics for a scope of normalized text.
 *
 * @example
 * const stats = computeDialogueStatistics("“你好。”他说。", { scopeId: "ch1" });
 */
export function computeDialogueStatistics(
  text: string,
  options: ComputeDialogueStatisticsOptions,
): DialogueStatistics {
  const scopeId = options.scopeId;
  const quoteStyles = options.quoteStyles ?? DEFAULT_DIALOGUE_QUOTE_STYLES;
  const excludeKinds = options.excludeKinds ?? [];

  const { spans, warnings } = extractDialogueSpans(text, quoteStyles);

  const classified = spans.map((span) => {
    if (excludeKinds.length === 0) {
      return span;
    }
    const kind = classifyExclusion(contentSlice(text, span), excludeKinds);
    return kind === undefined ? span : { ...span, excludedKind: kind };
  });

  const effectiveSpans = classified.filter((span) => span.excludedKind === undefined);
  const excludedCount = classified.length - effectiveSpans.length;
  if (excludedCount > 0) {
    warnings.push(`已排除 ${excludedCount} 段被标记为非正面对话的引文区间`);
  }

  const effectiveCharacterCount = countSignificant(text);
  const dialogueCharacterCount = effectiveSpans.reduce((sum, span) => {
    return sum + countSignificant(contentSlice(text, span));
  }, 0);

  const paragraphs = splitParagraphs(text);
  const dialogueParagraphCount = paragraphs.filter((paragraph) => {
    return effectiveSpans.some((span) => {
      return span.start < paragraph.end && span.end > paragraph.start;
    });
  }).length;

  const spanHasTag = new Map<DialogueSpan, boolean>();
  for (const span of effectiveSpans) {
    spanHasTag.set(span, findTagNearSpan(text, span));
  }
  const dialogueTagCount = Array.from(spanHasTag.values()).filter(Boolean).length;

  const ordered = [...effectiveSpans].sort((a, b) => a.start - b.start);
  let unattributedTurnCandidateCount = 0;
  for (let i = 1; i < ordered.length; i += 1) {
    const current = ordered[i];
    const previous = ordered[i - 1];
    const gap = text.slice(previous.end, current.start);
    const isAdjacent = gap.length <= MAX_ADJACENT_TURN_GAP && INSIGNIFICANT_BETWEEN_TURNS.test(gap);
    if (isAdjacent && !spanHasTag.get(current)) {
      unattributedTurnCandidateCount += 1;
    }
  }

  return {
    scopeId,
    effectiveCharacterCount,
    dialogueCharacterCount,
    dialogueCharacterRatio: clampRatio(
      effectiveCharacterCount === 0 ? 0 : dialogueCharacterCount / effectiveCharacterCount,
    ),
    paragraphCount: paragraphs.length,
    dialogueParagraphCount,
    dialogueParagraphRatio: clampRatio(
      paragraphs.length === 0 ? 0 : dialogueParagraphCount / paragraphs.length,
    ),
    dialogueTurnCount: effectiveSpans.length,
    dialogueTagCount,
    unattributedTurnCandidateCount,
    parserWarnings: warnings,
  };
}
