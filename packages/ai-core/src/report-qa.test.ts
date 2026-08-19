import { describe, expect, it } from "vitest";
import {
  REPORT_QA_REPORT_KIND_LABELS,
  REPORT_QA_REPORT_KINDS,
  REPORT_QA_SOURCE_KIND_LABELS,
  type ReportQaCitation,
  type ReportQaResult,
} from "./report-qa";

describe("report-qa contract", () => {
  it("labels every report kind", () => {
    for (const kind of REPORT_QA_REPORT_KINDS) {
      expect(REPORT_QA_REPORT_KIND_LABELS[kind]).toBeTruthy();
    }
    expect(Object.keys(REPORT_QA_REPORT_KIND_LABELS)).toHaveLength(REPORT_QA_REPORT_KINDS.length);
  });

  it("labels both citation source kinds", () => {
    expect(Object.keys(REPORT_QA_SOURCE_KIND_LABELS)).toEqual(["report", "source-text"]);
    expect(REPORT_QA_SOURCE_KIND_LABELS.report).toBe("报告内文");
    expect(REPORT_QA_SOURCE_KIND_LABELS["source-text"]).toBe("作品原文");
  });

  it("keeps a typical result assignable to the contract", () => {
    const citation: ReportQaCitation = {
      quote: "核心冲突是一次性的：复仇完成即失去动力。",
      source: "report",
      locator: "核心冲突",
      note: "判定原文",
    };
    const result: ReportQaResult = {
      mode: "model",
      reportKind: "premise-review",
      question: "为什么说我的冲突是一次性的？",
      answer: "报告在核心冲突处指出该冲突复仇完成即失去动力。",
      citations: [citation],
      gaps: [],
    };
    expect(result.citations[0]?.source).toBe("report");
    expect(result.mode).toBe("model");
  });
});
