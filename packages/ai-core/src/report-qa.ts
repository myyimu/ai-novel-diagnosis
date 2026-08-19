/**
 * Which text a QA citation is anchored to: the diagnosis report itself or the
 * author's submitted source text. Type-level closed set — there is no third
 * corpus to quote from, so the contract refuses it structurally.
 */
export type ReportQaSourceKind = "report" | "source-text";

/** Chinese labels for citation sources, shared by api prompts and web UI. */
export const REPORT_QA_SOURCE_KIND_LABELS: Record<ReportQaSourceKind, string> = {
  report: "报告内文",
  "source-text": "作品原文",
};

/** The diagnosis report kinds that carry a QA entry. */
export const REPORT_QA_REPORT_KINDS = [
  "quick-review",
  "premise-review",
  "story-audit",
] as const;

export type ReportQaReportKind = (typeof REPORT_QA_REPORT_KINDS)[number];

/** Chinese labels for report kinds, shared by api prompts and web UI. */
export const REPORT_QA_REPORT_KIND_LABELS: Record<ReportQaReportKind, string> = {
  "quick-review": "章节初诊报告",
  "premise-review": "立项审稿报告",
  "story-audit": "故事体检报告",
};

/**
 * One citation backing an answer. `quote` must be a contiguous substring of
 * the named source so the server can verify it mechanically (mirroring the
 * premise-review substring rule); citations that cannot be located are
 * dropped and disclosed in `gaps` instead of being shown.
 */
export interface ReportQaCitation {
  quote: string;
  source: ReportQaSourceKind;
  /** Where in the source the quote sits, e.g. "第 2 章" or a finding title. */
  locator?: string;
  /** Why this fragment supports the answer. */
  note?: string;
}

/** Which pipeline produced the answer: a demo placeholder or a real model call. */
export type ReportQaMode = "mock" | "model";

/**
 * Result of one anchored question about a diagnosis report. QA is an
 * explanatory interaction, not a medical-record asset: it is stateless
 * (the client supplies the report content), never persisted, and never
 * mutates the report it explains.
 */
export interface ReportQaResult {
  mode: ReportQaMode;
  reportKind: ReportQaReportKind;
  /** The question as asked (echoed for display). */
  question: string;
  answer: string;
  citations: ReportQaCitation[];
  /**
   * Honest disclosures: what the sources could not answer, plus any
   * citations the server dropped for failing the substring check.
   */
  gaps: string[];
}
