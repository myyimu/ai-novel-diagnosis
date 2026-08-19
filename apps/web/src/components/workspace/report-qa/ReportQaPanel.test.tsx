import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReportQaAnswerView, ReportQaPanel } from "./ReportQaPanel";
import type { ReportQaResult } from "@ai-novel-diagnosis/ai-core";
import { defaultProvider } from "@/stores/workspace-types";

const sampleResult: ReportQaResult = {
	mode: "model",
	reportKind: "premise-review",
	question: "为什么说我的冲突是一次性的？",
	answer: "报告判定冲突复仇完成后失去动力，没有持续施压的对立面。",
	citations: [
		{
			quote: "复仇动机缺乏自我升级的对立面，冲突是一次性的。",
			source: "report",
			locator: "俗套判定",
			note: "判定原文。",
		},
		{
			quote: "仇人的车停在楼下。",
			source: "source-text",
			locator: "第一章",
		},
	],
	gaps: ["报告没有提供大纲信息，无法回答节奏问题。"],
};

describe("ReportQaPanel", () => {
	it("renders the collapsed QA entry naming the report kind", () => {
		const html = renderToStaticMarkup(
			<ReportQaPanel
				provider={defaultProvider}
				reportKind="premise-review"
				report="【立项审稿报告】核心冲突：主角想复仇，而仇人是唯一能救他妹妹的人。"
			/>,
		);

		expect(html).toContain("对这份立项审稿报告有疑问？");
		expect(html).toContain("带引用的解释");
		expect(html).toContain("展开提问");
	});

	it("renders the quick-review entry with its own label", () => {
		const html = renderToStaticMarkup(
			<ReportQaPanel
				provider={defaultProvider}
				reportKind="quick-review"
				report="【章节初诊报告】主要问题：章末钩子没有代价。"
			/>,
		);

		expect(html).toContain("对这份章节初诊报告有疑问？");
	});
});

describe("ReportQaAnswerView", () => {
	it("renders the answer with anchored citations and source labels", () => {
		const html = renderToStaticMarkup(<ReportQaAnswerView result={sampleResult} />);

		expect(html).toContain("复仇完成后失去动力");
		expect(html).toContain("报告内文｜俗套判定");
		expect(html).toContain("作品原文｜第一章");
		expect(html).toContain("复仇动机缺乏自我升级的对立面，冲突是一次性的。");
		expect(html).toContain("仇人的车停在楼下。");
	});

	it("discloses gaps instead of hiding them", () => {
		const html = renderToStaticMarkup(<ReportQaAnswerView result={sampleResult} />);

		expect(html).toContain("未能回答的部分");
		expect(html).toContain("报告没有提供大纲信息，无法回答节奏问题。");
	});

	it("labels mock answers as demo so they cannot pass as judgment", () => {
		const html = renderToStaticMarkup(
			<ReportQaAnswerView result={{ ...sampleResult, mode: "mock" }} />,
		);

		expect(html).toContain("演示回答");
	});

	it("renders an answer without citations or gaps cleanly", () => {
		const html = renderToStaticMarkup(
			<ReportQaAnswerView result={{ ...sampleResult, citations: [], gaps: [] }} />,
		);

		expect(html).toContain("解答");
		expect(html).not.toContain("依据（");
		expect(html).not.toContain("未能回答的部分");
	});
});
