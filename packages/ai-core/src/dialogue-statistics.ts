import type { DialogueExcludeKind, DialogueStatistics } from "./story-audit";

export interface DialogueStatisticsInput {
  scopeId: string;
  text: string;
  excludeKinds?: DialogueExcludeKind[];
}

interface DialogueSpan {
  start: number;
  end: number;
  open: string;
  close: string;
  excludedKind?: DialogueExcludeKind;
  unclosed: boolean;
}

interface ParagraphRange {
  start: number;
  end: number;
}

const quotePairs = new Map([
  ["“", "”"],
  ["「", "」"],
  ["『", "』"],
]);

const dialogueTagPattern =
  /说|问|喊|叫|道|答|笑道|叹道|骂道|吼道|低声|喃喃|嘀咕|解释|提醒|命令|打断|开口|回答/;

const excludePatterns: Record<DialogueExcludeKind, RegExp> = {
  message: /(?:短信|消息|微信|弹幕|邮件|通知栏|聊天框|纸条)[:：\s]*$/,
  letter: /(?:信中写道|信上写着|信里|信中|来信|书信|遗书)[:：\s]*$/,
  system: /(?:系统|面板|公告|广播|提示音|机械音|电子音)[:：\s]*$/,
  "inner-monologue": /(?:心想|暗想|想道|想着|默念|心里说|内心)[:：\s]*$/,
};

/** Build deterministic dialogue ratios and turn counts from raw text.
 *
 * @example
 * const stats = buildDialogueStatistics({ scopeId: "ch-1", text: "她说：“走。”" });
 */
export function buildDialogueStatistics(input: DialogueStatisticsInput): DialogueStatistics {
  const paragraphs = buildParagraphRanges(input.text);
  const excludedKinds = new Set(input.excludeKinds ?? []);
  const spans = findDialogueSpans(input.text, excludedKinds);
  const includedSpans = spans.filter((span) => !span.excludedKind);
  const dialogueCharacters = includedSpans.reduce(
    (total, span) =>
      total + countEffectiveCharacters(input.text.slice(span.start + span.open.length, span.end)),
    0,
  );
  const dialogueParagraphIndexes = new Set<number>();
  for (const span of includedSpans) {
    paragraphs.forEach((paragraph, index) => {
      if (rangesOverlap(span.start, span.end, paragraph.start, paragraph.end)) {
        dialogueParagraphIndexes.add(index);
      }
    });
  }

  const dialogueTagCount = includedSpans.filter((span) => hasDialogueTag(input.text, span)).length;
  const parserWarnings = spans
    .filter((span) => span.unclosed)
    .map((span) => `Unclosed dialogue quote ${span.open}${span.close} in ${input.scopeId}.`);

  return {
    scopeId: input.scopeId,
    effectiveCharacterCount: countEffectiveCharacters(input.text),
    dialogueCharacterCount: dialogueCharacters,
    dialogueCharacterRatio: ratio(dialogueCharacters, countEffectiveCharacters(input.text)),
    paragraphCount: paragraphs.length,
    dialogueParagraphCount: dialogueParagraphIndexes.size,
    dialogueParagraphRatio: ratio(dialogueParagraphIndexes.size, paragraphs.length),
    dialogueTurnCount: includedSpans.length,
    dialogueTagCount,
    unattributedTurnCandidateCount: Math.max(0, includedSpans.length - dialogueTagCount),
    parserWarnings,
  };
}

function findDialogueSpans(text: string, excludeKinds: Set<DialogueExcludeKind>): DialogueSpan[] {
  const spans: DialogueSpan[] = [];
  let active:
    | {
        start: number;
        open: string;
        close: string;
        excludedKind?: DialogueExcludeKind;
      }
    | undefined;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (active) {
      if (char === active.close) {
        spans.push({
          ...active,
          end: index,
          unclosed: false,
        });
        active = undefined;
      }
      continue;
    }

    const close = quotePairs.get(char) ?? (char === '"' ? '"' : undefined);
    if (!close) {
      continue;
    }

    active = {
      start: index,
      open: char,
      close,
      excludedKind: inferExcludedKind(text, index, excludeKinds),
    };
  }

  if (active) {
    spans.push({
      ...active,
      end: text.length,
      unclosed: true,
    });
  }

  return spans;
}

function inferExcludedKind(
  text: string,
  quoteStart: number,
  excludeKinds: Set<DialogueExcludeKind>,
): DialogueExcludeKind | undefined {
  if (!excludeKinds.size) {
    return undefined;
  }

  const contextStart = Math.max(0, quoteStart - 24);
  const context = text.slice(contextStart, quoteStart).replace(/\s+/g, "");
  for (const kind of excludeKinds) {
    if (excludePatterns[kind].test(context)) {
      return kind;
    }
  }
  return undefined;
}

function buildParagraphRanges(text: string): ParagraphRange[] {
  const ranges: ParagraphRange[] = [];
  const pattern = /[^\n]*\S[^\n]*/g;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    ranges.push({
      start,
      end: start + match[0].length,
    });
  }
  return ranges;
}

function hasDialogueTag(text: string, span: DialogueSpan): boolean {
  const before = text.slice(Math.max(0, span.start - 16), span.start);
  const after = text.slice(
    span.end + span.close.length,
    Math.min(text.length, span.end + span.close.length + 16),
  );
  return dialogueTagPattern.test(before) || dialogueTagPattern.test(after);
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function countEffectiveCharacters(text: string): number {
  return text.replace(/\s/g, "").length;
}

function ratio(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Number((value / total).toFixed(4));
}
