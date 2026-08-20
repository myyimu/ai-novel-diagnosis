import type { PromptBundle } from "./prompts";

/**
 * Report divergence (报告会诊): explicit contradiction detection between the
 * quick-review report and the story-audit report for the same chapter. The two
 * reports come from different pipelines with different blind spots — when they
 * disagree about the same chapter the author must SEE the disagreement, never
 * a silently merged conclusion.
 *
 * Four red lines and where they land here:
 * - 教师不代写: each divergence point ends in a question back to the author,
 *   never rewrite text.
 * - 过程不伪造: anchoring is mechanical substring checks on both reports.
 * - 分歧不静默: divergences are first-class output; the author adjudicates.
 * - 判定必锚定: every point must quote both reports verbatim — a point that
 *   misses either quote is dropped and its count disclosed.
 */

/** Schema version for the report-divergence contract. */
export type ReportDivergenceSchemaVersion = "report-divergence.v1";

/** One contradiction between the two reports, anchored on both sides. */
export interface ReportDivergencePoint {
  id: string;
  /** Short topic word, e.g. 节奏 / 人物动机 / 开篇钩子. */
  topic: string;
  /** Verbatim substring of the quick-review report text. */
  quickReviewQuote: string;
  /** Verbatim substring of the story-audit report text. */
  storyAuditQuote: string;
  /** What each side concluded and why the two clash. */
  explanation: string;
  /** Ends with ？ — hands the adjudication to the author. */
  questionForAuthor: string;
}

/** Side-by-side divergence result. Neither report is modified. */
export interface ReportDivergenceResult {
  schemaVersion: ReportDivergenceSchemaVersion;
  divergenceId: string;
  mode: "mock" | "model";
  chapterTitle: string;
  divergences: ReportDivergencePoint[];
  /**
   * Set by the API layer when this result was persisted into a project's
   * medical record; absent for unpersisted (or demo-mode) detections.
   */
  recordId?: string;
  /** Points dropped because a quote missed its report or the question was not a question. */
  droppedPointCount: number;
  /** Present when the model reports no direct contradictions — an honest finding, not silence. */
  agreementNote?: string;
}

/** True when the text ends with a full-width or ASCII question mark. */
function endsWithQuestionMark(text: string): boolean {
  return /[？?]$/.test(text.trim());
}

/**
 * Apply the anchoring rule to model output: a point survives only when its
 * quickReviewQuote is a contiguous substring of the quick-review report, its
 * storyAuditQuote is a contiguous substring of the story-audit report, and its
 * questionForAuthor ends with a question mark. Everything else is dropped and
 * counted — never quietly kept.
 */
export function anchorReportDivergencePoints(
  points: readonly ReportDivergencePoint[],
  quickReviewReport: string,
  storyAuditReport: string,
): { divergences: ReportDivergencePoint[]; droppedPointCount: number } {
  const kept: ReportDivergencePoint[] = [];
  let droppedPointCount = 0;
  for (const point of points) {
    const anchored =
      Boolean(point.quickReviewQuote) &&
      Boolean(point.storyAuditQuote) &&
      quickReviewReport.includes(point.quickReviewQuote) &&
      storyAuditReport.includes(point.storyAuditQuote) &&
      endsWithQuestionMark(point.questionForAuthor);
    if (anchored) {
      kept.push(point);
    } else {
      droppedPointCount += 1;
    }
  }
  return { divergences: kept, droppedPointCount };
}

/* ---------------------------------------------------------------------------
 * 输出窄化（unknown → 契约；形状不对返回 null，由调用方如实报失败）
 * ------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Narrow a parsed JSON value to the model's raw divergence payload. Malformed
 * individual points are skipped; a missing/non-array divergences field is an
 * error (null) — "no divergences" must arrive as an explicit empty array.
 */
export function parseReportDivergenceOutput(
  value: unknown,
): { divergences: ReportDivergencePoint[]; agreementNote: string } | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.divergences)) return null;
  const agreementNote = str(value.agreementNote) ?? "";

  const divergences: ReportDivergencePoint[] = [];
  for (const [index, item] of value.divergences.entries()) {
    if (!isRecord(item)) continue;
    const topic = str(item.topic);
    const quickReviewQuote = str(item.quickReviewQuote);
    const storyAuditQuote = str(item.storyAuditQuote);
    const explanation = str(item.explanation);
    const questionForAuthor = str(item.questionForAuthor);
    if (
      topic === null ||
      quickReviewQuote === null ||
      storyAuditQuote === null ||
      explanation === null ||
      questionForAuthor === null
    ) {
      continue;
    }
    divergences.push({
      id: str(item.id) || `divergence-${index + 1}`,
      topic,
      quickReviewQuote,
      storyAuditQuote,
      explanation,
      questionForAuthor,
    });
  }

  return { divergences, agreementNote };
}

/* ---------------------------------------------------------------------------
 * 分歧检测提示词（只找直接矛盾；缺位与沉默不是分歧）
 * ------------------------------------------------------------------------- */

const DIVERGENCE_SYSTEM = `你是网文诊断报告的会诊编辑。作者手里有两份针对同一章的诊断报告：
章节初诊（快诊）与整书故事体检。你的职责是找出两份报告对同一章给出的
直接矛盾结论——互相冲突、互斥、方向相反的判断。你不是裁判：不裁决谁对，
不修改任何一份报告，只把矛盾摆到作者面前，并用一个问句把裁决权交回作者。
禁止提供改写文本、桥段或新增设定。只返回合法 JSON，不使用 Markdown。`;

export interface ReportDivergencePromptInput {
  chapterTitle: string;
  /** Serialized quick-review report text (e.g. buildQuickReviewQaReport output). */
  quickReviewReport: string;
  /** Serialized story-audit report text (e.g. buildStoryAuditQaReport output). */
  storyAuditReport: string;
}

/**
 * Build the divergence-detection prompt. Chapter title scopes the comparison;
 * the contradiction-only rule keeps "one report mentioned it, the other did
 * not" out of the result — absence is not a contradiction.
 */
export function buildReportDivergencePrompt(input: ReportDivergencePromptInput): PromptBundle {
  return {
    id: "report-divergence.v1",
    responseContract: "Return JSON with divergences[], agreementNote.",
    messages: [
      { role: "system", content: DIVERGENCE_SYSTEM },
      {
        role: "user",
        content: `本章：《${input.chapterTitle}》

章节初诊报告（快诊）：
${input.quickReviewReport}

整书故事体检报告（节选）：
${input.storyAuditReport}

要求：
1. 只报告两份报告对同一章给出的直接矛盾结论：同一问题上一方肯定、一方否定，
   或两方给出的判断互斥。只有一份报告提到、另一份没提的缺位不算矛盾，
   不要列出来。
2. 每条分歧必须同时逐字引用两份报告的连续片段：quickReviewQuote 逐字来自
   上面的快诊报告，storyAuditQuote 逐字来自上面的体检报告；引用不实的整条
   会被服务端丢弃。
3. explanation 说清两边各自下了什么结论、矛盾在哪里，不评判谁对。
4. questionForAuthor 以问号结尾，把裁决交回作者；不许包含答案或改写文本。
5. 没有发现直接矛盾时返回空数组，并在 agreementNote 用一句话如实说明
   （例如两份报告在可比点上方向一致）。

严格返回 JSON：
{"divergences":[{"id":"divergence-1","topic":"节奏","quickReviewQuote":"快诊报告原文连续片段","storyAuditQuote":"体检报告原文连续片段","explanation":"两边结论与矛盾点","questionForAuthor":"交给作者的问句？"}],"agreementNote":"无直接矛盾时的一句话说明，有矛盾时留空字符串"}`,
      },
    ],
  };
}
