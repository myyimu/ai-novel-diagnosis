import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { BookAnalysisResult } from "@/stores/workspace-store";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/hooks/use-provider-connection", () => ({
	useProviderConnection: () => ({
		providerConnection: {
			status: "success",
			providerName: "本地演示",
			modelName: "demo",
			message: "",
		},
		testCurrentProvider: vi.fn(),
	}),
}));

const storyAudit = {
	schemaVersion: "story-audit.v1",
	auditId: "audit-a",
	projectId: "project-a",
	bookJobId: "book-job-a",
	generatedAt: "2026-07-18T08:00:00.000Z",
	coverage: {
		analyzedChapterIds: ["chapter-1", "chapter-2"],
		totalChapterCount: 2,
		isPartial: false,
		sceneExtractionRate: 1,
		evidenceValidationRate: 1,
	},
	scenes: [
		{
			id: "scene-1",
			chapterId: "chapter-1",
			orderInChapter: 1,
			narrativeOrder: 1,
			title: "相遇",
			locationIds: [],
			participantIds: ["hero"],
			evidence: [],
		},
	],
	events: [],
	facts: [],
	characterStates: [],
	findings: [
		{
			id: "finding-a",
			category: "timeline_conflict",
			severity: "high",
			status: "candidate",
			title: "同一夜晚出现时间冲突",
			claim: "同一事件被写成发生在午夜前后两种顺序。",
			evidence: [
				{
					anchorId: "anchor-a",
					chapterId: "chapter-1",
					chapterOrder: 1,
					quote: "钟声刚过子夜。",
					startOffset: 12,
					endOffset: 19,
					source: "text",
				},
				{
					anchorId: "anchor-b",
					chapterId: "chapter-2",
					chapterOrder: 2,
					quote: "他在子夜前已经离开。",
					startOffset: 32,
					endOffset: 43,
					source: "text",
				},
			],
			relatedFactIds: [],
			relatedEventIds: [],
			ruleIds: ["temporal.before-after-cycle"],
			alternativeExplanations: ["可能是角色转述错误。"],
			confidence: 0.76,
		},
	],
	metrics: {
		dialogue: [
			{
				scopeId: "book",
				effectiveCharacterCount: 1000,
				dialogueCharacterCount: 270,
				dialogueCharacterRatio: 0.27,
				paragraphCount: 20,
				dialogueParagraphCount: 6,
				dialogueParagraphRatio: 0.3,
				dialogueTurnCount: 14,
				dialogueTagCount: 3,
				unattributedTurnCandidateCount: 1,
				parserWarnings: [],
			},
		],
	},
	views: {
		temporalGraph: {
			eventIds: [],
			relationEdges: [],
			conflictCandidateIds: [],
		},
		plotlineMatrix: [],
		setupPayoffEdges: [],
	},
} satisfies NonNullable<BookAnalysisResult["storyAudit"]>;

const bookAnalysisResult = {
	mode: "full",
	book: {
		title: "测试书",
		genre: "玄幻",
		chapterCountEstimate: 2,
		oneSentencePremise: "主角追查旧案。",
		coreAppeal: ["悬念"],
	},
	storyAudit,
} as unknown as BookAnalysisResult;

vi.mock("@/hooks/use-workspace-handlers", () => ({
	useWorkspaceHandlers: () => ({
		activeProject: {
			id: "project-a",
			name: "测试书",
			bookJobId: "book-job-a",
			analysisPurpose: "story-audit",
			createdAt: "2026-07-18T08:00:00.000Z",
			updatedAt: "2026-07-18T08:00:00.000Z",
		},
		activeProjectId: "project-a",
		projectRevisionSessions: [],
		projectMethodologyCards: [],
		providerLabel: "本地演示",
		bookAnalysisResult,
		bookJob: {
			id: "book-job-a",
		},
	}),
}));

vi.mock("@/stores/workspace-store", () => ({
	useWorkspaceStore: <T,>(
		selector: (state: {
			bookAnalysisCache: Array<{
				job: { id: string };
				result: BookAnalysisResult | null;
			}>;
			setBookAnalysisResult: (result: BookAnalysisResult | null) => void;
			setBookJob: (job: unknown) => void;
		}) => T,
	): T =>
		selector({
			bookAnalysisCache: [{ job: { id: "book-job-a" }, result: bookAnalysisResult }],
			setBookAnalysisResult: vi.fn(),
			setBookJob: vi.fn(),
		}),
}));

vi.mock("@/lib/workspace-analysis-client", () => ({
	readBookAnalysisJob: vi.fn(),
	readStoryAuditFindingReviews: vi.fn().mockResolvedValue([]),
	upsertStoryAuditFindingReview: vi.fn(),
}));

import { ProjectHealthPage } from "./ProjectHealthPage";

describe("ProjectHealthPage", () => {
	it("renders story audit evidence, deterministic statistics, and project-aware evidence links", () => {
		const html = renderToStaticMarkup(<ProjectHealthPage />);

		expect(html).toContain("故事体检");
		expect(html).toContain("非评分");
		expect(html).toContain("27%");
		expect(html).toContain("同一夜晚出现时间冲突");
		expect(html).toContain("可能是角色转述错误。");
		expect(html).toContain(
			"/project/current?id=project-a&amp;chapter=chapter-1&amp;anchor=anchor-a",
		);
		expect(html).toContain("人工判断不会写入 storyAudit 原始结果");
		expect(push).not.toHaveBeenCalled();
	});
});
