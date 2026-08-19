import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PremiseReviewCompose } from "./PremiseReviewCompose";
import type {
	PremiseEngineCard,
	PremiseFindingReview,
	PremiseReviewResult,
} from "@ai-novel-diagnosis/ai-core";

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

const premiseReviewResult = {
	schemaVersion: "premise-review.v1",
	reviewId: "review-1",
	premiseSummary: "一个重生复仇兼流量收割的故事。",
	coreConflict: "主角想揭穿背叛者，而背叛者掌握他的舆论生死。",
	protagonistDesire: "避开前世的每一个遗憾。",
	opposingForce: "掌握流量与资源的背叛者们。",
	irreducibilityTest: "换成职场背景后两难仍然成立。",
	readerHookQuestion: "他这次会先原谅还是先揭穿？",
	engineVerdict: "fixable",
	oneLineVerdict: "发动机成立，但阻力需要从被动遗憾改为主动对抗。",
	layers: [
		{
			layer: "engine",
			status: "weak",
			statement: "欲望明确但障碍被动。",
			confidence: 0.7,
			comment: "遗憾不会自己升级为压力。",
		},
		{
			layer: "desire",
			status: "established",
			statement: "避开所有遗憾。",
			confidence: 0.8,
		},
		{
			layer: "conflict",
			status: "missing",
			statement: "",
			confidence: 0.2,
		},
		{
			layer: "irreducibility",
			status: "established",
			statement: "两难独立于设定。",
			confidence: 0.75,
		},
	],
	clicheFindings: [
		{
			id: "cliche-1",
			layer: "engine",
			severity: "high",
			title: "无代价重生金手指",
			claim: "前世记忆没有任何代价，冲突无法自我升级。",
			evidence: [{ quote: "带着前世记忆避开所有遗憾", note: "金手指无对价" }],
			patternReference: "开局无敌重生流",
			suggestion: "让每次使用前世记忆都消耗他现在最在乎的关系。",
			status: "verified",
			verificationNote: "该模式确实泛滥且引文相符。",
		},
	],
	upgradeDirections: [
		{
			directionId: "direction-emotion",
			orientation: "emotion",
			pitch: "把复仇故事改成必须先救仇人的故事。",
			changedConflict: "越接近揭穿目标，越需要那个背叛者活着。",
			preservedElements: ["重生设定"],
			risk: "情感线会让爽点节奏变慢。",
		},
	],
	verification: {
		attemptedCount: 1,
		skippedCount: 0,
		rejectedCount: 0,
		unavailableCount: 0,
		verifiedCount: 1,
	},
} satisfies PremiseReviewResult;

const premiseContractDraft = {
	premiseSummary: premiseReviewResult.premiseSummary,
	coreConflict: premiseReviewResult.coreConflict,
	protagonistDesire: premiseReviewResult.protagonistDesire,
	opposingForce: premiseReviewResult.opposingForce,
	irreducibilityTest: premiseReviewResult.irreducibilityTest,
	readerHookQuestion: premiseReviewResult.readerHookQuestion,
};

const savedEngineCard: PremiseEngineCard = {
	projectId: "default-project",
	status: "confirmed",
	premiseSummary: premiseReviewResult.premiseSummary,
	coreConflict: premiseReviewResult.coreConflict,
	protagonistDesire: premiseReviewResult.protagonistDesire,
	opposingForce: premiseReviewResult.opposingForce,
	irreducibilityTest: premiseReviewResult.irreducibilityTest,
	readerHookQuestion: premiseReviewResult.readerHookQuestion,
	engineVerdict: "fixable",
	reviewId: "review-1",
	confirmedAt: "2026-08-18T08:00:00.000Z",
	updatedAt: "2026-08-18T08:00:00.000Z",
};

const savedFindingReview: PremiseFindingReview = {
	projectId: "default-project",
	reviewId: "review-1",
	findingId: "cliche-1",
	reviewState: "author_intent",
	updatedAt: "2026-08-18T08:00:00.000Z",
};

function baseProps(overrides: Partial<Parameters<typeof PremiseReviewCompose>[0]> = {}) {
	return {
		providerLabel: "本地演示",
		isMockProvider: true,
		premiseText: "",
		onPremiseTextChange: () => {},
		genre: "",
		onGenreChange: () => {},
		isReviewing: false,
		elapsedSeconds: 0,
		error: null,
		result: null,
		onRunReview: () => {},
		onWriteFirstChapter: () => {},
		targetProjectName: "测试作品",
		contract: null,
		onContractChange: () => {},
		engineCard: null,
		isSavingCard: false,
		cardError: null,
		onSaveCard: () => {},
		findingReviews: [],
		isSavingReview: false,
		onReviewFinding: () => {},
		...overrides,
	};
}

describe("PremiseReviewCompose", () => {
	it("renders the premise input state with the three-state promise", () => {
		const html = renderToStaticMarkup(<PremiseReviewCompose {...baseProps()} />);

		expect(html).toContain("立项审稿");
		expect(html).toContain("这个故事值不值得写");
		expect(html).toContain("灵感原文");
		expect(html).toContain("三态判定");
		expect(html).toContain("升级方向");
		expect(html).toContain("先找理由拒绝");
		expect(html).toContain("演示模型只返回占位结构");
	});

	it("renders the verdict banner, audit layers and editable engine card for a result", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					result: premiseReviewResult,
					contract: premiseContractDraft,
				})}
			/>,
		);

		expect(html).toContain("值得写，但先修这几处");
		expect(html).toContain("发动机成立，但阻力需要从被动遗憾改为主动对抗");
		expect(html).toContain("发动机卡（编辑的重述，可改写后确认）");
		expect(html).toContain("故事概述（编辑重述）");
		expect(html).toContain("主角想揭穿背叛者，而背叛者掌握他的舆论生死");
		expect(html).toContain("保存为草稿");
		expect(html).toContain("确认发动机契约");
		expect(html).toContain("复制契约");
		expect(html).toContain("核心冲突为必填");
		expect(html).toContain("四层审计");
		expect(html).toContain("故事发动机");
		expect(html).toContain("不可替代性");
		expect(html).toContain("待修补");
		expect(html).toContain("俗套点");
		expect(html).toContain("你的原文");
		expect(html).toContain("带着前世记忆避开所有遗憾");
		expect(html).toContain("已复核");
		expect(html).toContain("情感");
		expect(html).toContain("1 条已确认");
	});

	it("shows the saved engine card status chip with the project name in the note", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					contract: premiseContractDraft,
					engineCard: savedEngineCard,
				})}
			/>,
		);

		expect(html).toContain("当前保存状态：已确认");
		expect(html).toContain("重新保存会覆盖已存的卡片");
		expect(html).toContain("《测试作品》");
	});

	it("renders the four author decision actions with the current state highlighted", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					result: premiseReviewResult,
					contract: premiseContractDraft,
					findingReviews: [savedFindingReview],
				})}
			/>,
		);

		expect(html).toContain("你的判定：");
		expect(html).toContain("确认俗套");
		expect(html).toContain("作者意图");
		expect(html).toContain("误报");
		expect(html).toContain("搁置");
	});

	it("disables decision actions when the result carries no reviewId", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					result: { ...premiseReviewResult, reviewId: undefined },
					contract: premiseContractDraft,
				})}
			/>,
		);

		expect(html).toContain("你的判定：");
		expect(html).toMatch(/<button[^>]*disabled[^>]*>\s*确认俗套/);
	});

	it("shows the engine card editor standalone when returning without a result", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					contract: premiseContractDraft,
					engineCard: savedEngineCard,
				})}
			/>,
		);

		expect(html).toContain("发动机卡（编辑的重述，可改写后确认）");
		expect(html).toContain("确认发动机契约");
	});

	it("shows the card error banner inside the editor", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					result: premiseReviewResult,
					contract: premiseContractDraft,
					cardError: "发动机卡保存失败，请稍后重试。",
				})}
			/>,
		);

		expect(html).toContain("发动机卡保存失败");
	});

	it("discloses when a finding's quotes were rejected server-side", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose
				{...baseProps({
					result: {
						...premiseReviewResult,
						clicheFindings: [
							{
								...premiseReviewResult.clicheFindings[0]!,
								evidence: [],
								verificationNote:
									"证据引文无法在原始灵感中定位，服务端已拒绝该俗套判定。",
							},
						],
					},
				})}
			/>,
		);

		expect(html).toContain("未能在你的原文中定位");
		expect(html).not.toContain("你的判定：");
	});

	it("renders the error banner without a result", () => {
		const html = renderToStaticMarkup(
			<PremiseReviewCompose {...baseProps({ error: "模型连接失败，请稍后重试。" })} />,
		);

		expect(html).toContain("审稿未完成");
		expect(html).toContain("模型连接失败");
		expect(html).not.toContain("发动机卡（编辑的重述");
	});
});
