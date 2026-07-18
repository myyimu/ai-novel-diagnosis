import { afterEach, describe, expect, it, vi } from "vitest";

import {
	requestMethodologyCards,
	requestPlatformFit,
	requestQuickReview,
	readStoryAuditFindingReviews,
	upsertRevisionAssets,
	upsertStoryAuditFindingReview,
} from "./workspace-analysis-client";
import type { ProviderForm } from "@/stores/workspace-store";

const provider: ProviderForm = {
	preset: "shared-gpu",
	kind: "openai-compatible",
	baseUrl: "",
	apiKey: "",
	model: "",
	temperature: 0.2,
	jsonMode: false,
};

function okJson(data: unknown): Response {
	return new Response(JSON.stringify({ code: 0, message: "ok", data }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

function readJsonBody(init: RequestInit | undefined): Record<string, unknown> {
	return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

describe("workspace analysis client", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends quick review with deprecated methodology generation disabled", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			okJson({
				title: "快速诊断",
				summary: "summary",
				mainProblem: "problem",
				diagnosis: [],
				issues: [],
				revisionPlan: { keep: [], change: [], avoid: [], checkpoints: [] },
				nextPrompt: { title: "prompt", prompt: "rewrite", linkedIssueIds: [] },
				methodologyCards: [],
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await requestQuickReview({
			provider,
			chapterText: "章节正文",
			chapterTitle: "第一章",
			quickReviewGenre: "都市",
			includeMethodologyCards: false,
		});

		const [url, init] = fetchMock.mock.calls[0];
		const body = readJsonBody(init);

		expect(url).toBe("/api/v1/analysis/quick-review");
		expect(body.includeMethodologyCards).toBe(false);
	});

	it("requests methodology cards from structured diagnosis output only", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(okJson({ methodologyCards: [] }));
		vi.stubGlobal("fetch", fetchMock);

		await requestMethodologyCards({
			provider,
			projectId: "project-1",
			revisionSessionId: "session-1",
			issues: [
				{
					id: "issue-1",
					severity: "high",
					category: "opening",
					title: "首屏冲突不足",
					description: "开头没有形成压力。",
					evidence: [{ quote: "他醒了。", locationHint: "首屏", confidence: 0.8 }],
					readerImpact: "读者缺少继续看下去的理由。",
					fixAction: "提前不可回避的选择。",
					promptConstraint: "保留人物关系。",
					blocksNextStep: true,
				},
			],
			revisionPlan: {
				priorityIssueIds: ["issue-1"],
				keep: ["人物关系"],
				change: ["冲突前置"],
				avoid: ["解释设定"],
				checkpoints: ["三百字内出现压力"],
			},
			nextPrompt: {
				title: "重写首屏",
				prompt: "请强化冲突。",
				linkedIssueIds: ["issue-1"],
				whyThisWorks: ["对应首屏冲突不足的问题。"],
			},
		});

		const [url, init] = fetchMock.mock.calls[0];
		const body = readJsonBody(init);

		expect(url).toBe("/api/v1/analysis/methodology-cards");
		expect(body.projectId).toBe("project-1");
		expect(body.revisionSessionId).toBe("session-1");
		expect(body).not.toHaveProperty("chapterText");
		expect(body).not.toHaveProperty("title");
		expect(body.issues).toEqual([
			expect.objectContaining({
				id: "issue-1",
				title: "首屏冲突不足",
				readerImpact: "读者缺少继续看下去的理由。",
			}),
		]);
	});

	it("requests platform fit as a separate context-based hypothesis", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			okJson({
				summary: "summary",
				assumptions: [],
				recommendations: [],
				disclaimer: "这是编辑假设，不是平台内部算法结论。",
				dataVersion: "v3",
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await requestPlatformFit({
			provider,
			candidatePlatform: "番茄小说",
			targetReader: "下沉市场爽文读者",
			readingMode: "碎片化阅读",
			workLength: "长篇",
			genre: "都市",
			coreSellingPoint: "小人物逆袭",
			title: "第一章",
			issues: [
				{
					id: "issue-1",
					severity: "medium",
					category: "conflict_pressure",
					title: "情绪钩子不足",
					description: "缺少明确情绪落点。",
					evidence: [],
					readerImpact: "影响追读欲望。",
					fixAction: "补充受辱反击链条。",
					promptConstraint: "保留设定。",
					blocksNextStep: false,
				},
			],
		});

		const [url, init] = fetchMock.mock.calls[0];
		const body = readJsonBody(init);

		expect(url).toBe("/api/v1/analysis/platform-fit");
		expect(body.candidatePlatform).toBe("番茄小说");
		expect(body.coreSellingPoint).toBe("小人物逆袭");
		expect(body).not.toHaveProperty("chapterText");
		expect(body.issues).toEqual([
			{
				title: "情绪钩子不足",
				readerImpact: "影响追读欲望。",
				fixAction: "补充受辱反击链条。",
			},
		]);
	});

	it("persists revision assets with real text versions", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			okJson({
				projects: [],
				revisionSessions: [],
				revisionVersions: [],
				methodologyCards: [],
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await upsertRevisionAssets({
			project: {
				id: "project-a",
				name: "测试书",
				bookJobId: "book-job-a",
				analysisPurpose: "story-audit",
				createdAt: "2026-06-24T00:00:00.000Z",
				updatedAt: "2026-06-24T01:00:00.000Z",
			},
			session: {
				id: "revision-1",
				projectId: "project-a",
				createdAt: "2026-06-24T01:00:00.000Z",
				chapterTitle: "第一章",
				genre: "xuanhuan",
				inputKind: "human-draft",
				textHash: "hash-1",
				textLength: 4,
				quickScore: 6.4,
				gateDecision: "revise",
				mainProblem: "章末钩子弱",
				issueTitles: ["章末钩子弱"],
				methodologyCardIds: [],
				storyAuditFindingIds: ["finding-1"],
				toVersionId: "version-1",
				textChanged: true,
			},
			revisionVersions: [
				{
					id: "version-1",
					projectId: "project-a",
					createdAt: "2026-06-24T01:00:00.000Z",
					chapterTitle: "第一章",
					versionLabel: "V1",
					textHash: "hash-1",
					textLength: 4,
					text: "正文一",
					sourceSessionId: "revision-1",
				},
			],
			methodologyCards: [],
		});

		const [url, init] = fetchMock.mock.calls[0];
		const body = readJsonBody(init);

		expect(url).toBe("/api/v1/analysis/workspace/revision-assets");
		expect(body.project).toMatchObject({
			bookJobId: "book-job-a",
			analysisPurpose: "story-audit",
		});
		expect(body.session).toMatchObject({
			storyAuditFindingIds: ["finding-1"],
		});
		expect(body.revisionVersions).toEqual([
			expect.objectContaining({
				id: "version-1",
				text: "正文一",
				sourceSessionId: "revision-1",
			}),
		]);
		expect(body.session).toEqual(
			expect.objectContaining({
				toVersionId: "version-1",
				textChanged: true,
			}),
		);
	});

	it("persists story audit finding review state without sending story audit result", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			okJson({
				projectId: "project-a",
				auditId: "audit-a",
				findingId: "finding-a",
				reviewState: "confirmed",
				note: "确认为问题",
				updatedAt: "2026-07-18T08:00:00.000Z",
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await upsertStoryAuditFindingReview({
			projectId: "project-a",
			auditId: "audit-a",
			findingId: "finding-a",
			reviewState: "confirmed",
			note: "确认为问题",
			updatedAt: "2026-07-18T08:00:00.000Z",
		});

		const [url, init] = fetchMock.mock.calls[0];
		const body = readJsonBody(init);

		expect(url).toBe("/api/v1/analysis/workspace/story-audit/reviews");
		expect(body).toEqual({
			projectId: "project-a",
			auditId: "audit-a",
			findingId: "finding-a",
			reviewState: "confirmed",
			note: "确认为问题",
			updatedAt: "2026-07-18T08:00:00.000Z",
		});
		expect(body).not.toHaveProperty("storyAudit");
		expect(body).not.toHaveProperty("reviewStateByFinding");
	});

	it("reads story audit finding reviews by project id", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(okJson([]));
		vi.stubGlobal("fetch", fetchMock);

		await readStoryAuditFindingReviews("project/a");

		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			"/api/v1/analysis/workspace/story-audit/reviews/project%2Fa",
		);
	});
});
