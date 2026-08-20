import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	AdjudicationNoteSection,
	DivergenceResultView,
	ReportDivergencePanel,
} from "./ReportDivergencePanel";
import type { QuickReviewResult, ReportDivergenceResult } from "@ai-novel-diagnosis/ai-core";
import type { StoryAuditResult } from "@/stores/workspace-store";
import { defaultProvider } from "@/stores/workspace-types";

const quickReviewResult = {
	title: "第三章 对峙",
	genre: "都市",
	positioning: "强冲突对峙章",
	sellingPoints: ["对话推进快"],
	mainProblem: "对话推进有效，节奏紧凑，没有明显拖沓。",
	actionableFixes: [],
	recommendedPlatforms: [],
	readyForFullReview: true,
	readyReason: "结构完整。",
	quickScore: 7,
	confidence: 0.8,
} satisfies QuickReviewResult;

const storyAudit = {
	schemaVersion: "story-audit.v1",
	auditId: "audit-1",
	projectId: "default-project",
	bookJobId: "job-1",
	generatedAt: "2026-08-20T08:00:00.000Z",
	coverage: {
		analyzedChapterIds: ["chapter-1", "chapter-2", "chapter-3"],
		totalChapterCount: 3,
		isPartial: false,
		sceneExtractionRate: 1,
		evidenceValidationRate: 0.9,
	},
	scenes: [],
	events: [],
	facts: [],
	characterStates: [],
	findings: [
		{
			id: "finding-1",
			category: "structure_signal",
			severity: "high",
			title: "第三章节奏拖沓",
			claim: "连续四段没有推进新信息。",
			alternativeExplanations: [],
			evidence: [
				{
					anchorId: "anchor-1",
					chapterId: "chapter-3",
					chapterOrder: 3,
					quote: "连续四段没有推进新信息",
					startOffset: 0,
					endOffset: 10,
					source: "text",
				},
			],
			confidence: 0.8,
			status: "verified",
			relatedFactIds: [],
			relatedEventIds: [],
			ruleIds: [],
		},
	],
	metrics: { dialogue: [] },
	views: {
		temporalGraph: { eventIds: [], relationEdges: [], conflictCandidateIds: [] },
		plotlineMatrix: [],
		setupPayoffEdges: [],
	},
} satisfies StoryAuditResult;

const divergenceResult = {
	schemaVersion: "report-divergence.v1",
	divergenceId: "divergence-1",
	mode: "model",
	chapterTitle: "第三章 对峙",
	divergences: [
		{
			id: "divergence-1",
			topic: "节奏",
			quickReviewQuote: "节奏紧凑，没有明显拖沓",
			storyAuditQuote: "第三章节奏拖沓",
			explanation: "快诊认为本章节奏紧凑，体检认为本章节奏拖沓。",
			questionForAuthor: "这章连续四段没有新信息，你自己读起来拖吗？",
		},
	],
	droppedPointCount: 1,
} satisfies ReportDivergenceResult;

describe("ReportDivergencePanel", () => {
	it("renders the divergence entry explaining the contradiction-only rule", () => {
		const html = renderToStaticMarkup(
			<ReportDivergencePanel
				provider={defaultProvider}
				quickReviewResult={quickReviewResult}
				storyAudit={storyAudit}
			/>,
		);

		expect(html).toContain("报告会诊：快诊 × 体检");
		expect(html).toContain("矛盾结论");
		expect(html).toContain("两份报告都保留原样");
		expect(html).toContain("检测矛盾结论");
		expect(html).toContain("一方肯定、一方否定");
		expect(html).toContain("的直接矛盾才算分歧");
	});
});

describe("DivergenceResultView", () => {
	it("presents each contradiction with both anchored quotes and the author's question", () => {
		const html = renderToStaticMarkup(<DivergenceResultView result={divergenceResult} />);

		expect(html).toContain("矛盾 · 节奏");
		expect(html).toContain("快诊报告说");
		expect(html).toContain("「节奏紧凑，没有明显拖沓」");
		expect(html).toContain("体检报告说");
		expect(html).toContain("「第三章节奏拖沓」");
		expect(html).toContain("快诊认为本章节奏紧凑，体检认为本章节奏拖沓。");
		expect(html).toContain("交给你裁决");
		expect(html).toContain("你自己读起来拖吗？");
		expect(html).toContain("另有 1 条分歧未能在两份报告中同时锚定");
		expect(html).toContain("矛盾不会被自动消解");
	});

	it("reports the honest no-conflict finding instead of silence", () => {
		const html = renderToStaticMarkup(
			<DivergenceResultView
				result={{
					...divergenceResult,
					divergences: [],
					droppedPointCount: 0,
					agreementNote: "两份报告在可比点上方向一致。",
				}}
			/>,
		);

		expect(html).toContain("两份报告在可比点上方向一致。");
		expect(html).not.toContain("另有");
	});

	it("discloses demo mode instead of passing the placeholder off as a finding", () => {
		const html = renderToStaticMarkup(
			<DivergenceResultView result={{ ...divergenceResult, mode: "mock" }} />,
		);

		expect(html).toContain("演示模式");
		expect(html).toContain("不代表两份报告真实矛盾");
	});

	it("confirms the detection entered the project record only when recordId is present", () => {
		const persisted = renderToStaticMarkup(
			<DivergenceResultView result={{ ...divergenceResult, recordId: "record-1" }} />,
		);
		const unpersisted = renderToStaticMarkup(
			<DivergenceResultView result={divergenceResult} />,
		);

		expect(persisted).toContain("本次检测已记入项目病历");
		expect(unpersisted).not.toContain("本次检测已记入项目病历");
	});
});

describe("AdjudicationNoteSection", () => {
	it("renders the author adjudication form that only saves a note", () => {
		const html = renderToStaticMarkup(
			<AdjudicationNoteSection
				noteText=""
				onNoteChange={() => {}}
				onSave={() => {}}
				saving={false}
				savedNote={null}
				error={null}
			/>,
		);

		expect(html).toContain("你的裁决（可选，记入项目病历）");
		expect(html).toContain("两份报告你信哪一份？");
		expect(html).toContain("只保存这句话；上面的检测结果不会被改写。");
		expect(html).toContain("保存裁决");
	});

	it("shows the saved adjudication once persisted", () => {
		const html = renderToStaticMarkup(
			<AdjudicationNoteSection
				noteText="我信体检：这章确实拖。"
				onNoteChange={() => {}}
				onSave={() => {}}
				saving={false}
				savedNote="我信体检：这章确实拖。"
				error={null}
			/>,
		);

		expect(html).toContain("已记录：我信体检：这章确实拖。");
	});
});
