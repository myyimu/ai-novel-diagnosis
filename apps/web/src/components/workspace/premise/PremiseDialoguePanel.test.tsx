import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	ContractReviewView,
	DialogueJudgeView,
	DialogueTurnView,
	PremiseDialoguePanel,
} from "./PremiseDialoguePanel";
import type { PremiseReviewResult } from "@ai-novel-diagnosis/ai-core";
import { defaultProvider } from "@/stores/workspace-types";

const reviewResult = {
	schemaVersion: "premise-review.v1",
	reviewId: "review-1",
	premiseSummary: "一个重生复仇兼流量收割的故事。",
	coreConflict: "主角想揭穿背叛者，而背叛者掌握他的舆论生死。",
	protagonistDesire: "避开前世的每一个遗憾。",
	opposingForce: "掌握流量与资源的背叛者们。",
	irreducibilityTest: "换成职场背景后两难仍然成立。",
	readerHookQuestion: "他这次会先原谅还是先揭穿？",
	engineVerdict: "fixable",
	oneLineVerdict: "发动机成立，但阻力需要升级。",
	layers: [
		{ layer: "engine", status: "weak", statement: "欲望明确但障碍被动。", confidence: 0.7 },
		{ layer: "desire", status: "established", statement: "避开所有遗憾。", confidence: 0.8 },
		{ layer: "conflict", status: "missing", statement: "", confidence: 0.2 },
		{
			layer: "irreducibility",
			status: "established",
			statement: "两难独立于设定。",
			confidence: 0.75,
		},
	],
	clicheFindings: [],
	upgradeDirections: [],
} satisfies PremiseReviewResult;

describe("PremiseDialoguePanel", () => {
	it("renders the intro explaining the teacher posture and the hand-written contract", () => {
		const html = renderToStaticMarkup(
			<PremiseDialoguePanel
				provider={defaultProvider}
				projectId="default-project"
				premiseText="主角重生回高三开学第一天，带着前世记忆她决定这次要活成自己。"
				review={reviewResult}
			/>,
		);

		expect(html).toContain("立项引导对话");
		expect(html).toContain("编辑只提问、不代写");
		expect(html).toContain("判定必须引用你的原话");
		expect(html).toContain("开始引导对话");
		expect(html).toContain("亲笔才算契约");
	});
});

describe("DialogueTurnView", () => {
	it("renders the question with its why and the anchored premise quote", () => {
		const html = renderToStaticMarkup(
			<DialogueTurnView
				turn={{
					round: 1,
					layer: "conflict",
					ask: {
						question: "谁会在故事里持续阻止她？",
						whyThisQuestion: "阻力缺位让发动机空转。",
						hintQuote: "带着前世记忆她决定",
						hintQuoteStatus: "anchored",
					},
				}}
			/>,
		);

		expect(html).toContain("第 1 轮 · 持续冲突");
		expect(html).toContain("谁会在故事里持续阻止她？");
		expect(html).toContain("为什么问这个");
		expect(html).toContain("带着前世记忆她决定");
	});

	it("discloses a quote-rejected judgment instead of silently dropping it", () => {
		const html = renderToStaticMarkup(
			<DialogueTurnView
				turn={{
					round: 1,
					layer: "conflict",
					ask: {
						question: "谁会在故事里持续阻止她？",
						whyThisQuestion: "",
						hintQuote: "",
						hintQuoteStatus: "empty",
					},
					authorAnswer: "班主任会阻止她。",
					judgeRejected: { reason: "quote-not-found" },
				}}
			/>,
		);

		expect(html).toContain("你的回答");
		expect(html).toContain("班主任会阻止她。");
		expect(html).toContain("没能锚定你的原话");
		expect(html).toContain("已被服务端拒绝");
	});

	it("offers a retry hint for model failures while keeping the answer visible", () => {
		const html = renderToStaticMarkup(
			<DialogueTurnView
				turn={{
					round: 2,
					layer: "engine",
					ask: {
						question: "她每次使用前世记忆要付出什么代价？",
						whyThisQuestion: "",
						hintQuote: "",
						hintQuoteStatus: "empty",
					},
					authorAnswer: "每次都会忘记一段前世记忆。",
					judgeRejected: { reason: "model-failed" },
				}}
			/>,
		);

		expect(html).toContain("判定未能生成");
		expect(html).toContain("你的回答已保存");
		expect(html).toContain("重新评判");
	});
});

describe("DialogueJudgeView", () => {
	it("anchors the verdict on the quoted author words and surfaces disagreement", () => {
		const html = renderToStaticMarkup(
			<DialogueJudgeView
				judge={{
					verdict: "not-yet",
					quoteAuthor: "每次都会忘记一段前世记忆",
					reason: "代价明确但阻力仍未成形。",
					layerStatusSuggestion: "weak",
					followUp: "谁最先利用她的遗忘？",
					disagreementNote: "与审稿结论不同：这里认为代价已经成立。",
				}}
			/>,
		);

		expect(html).toContain("编辑判定：还不够");
		expect(html).toContain("每次都会忘记一段前世记忆");
		expect(html).toContain("与审稿结论的分歧");
		expect(html).toContain("这里认为代价已经成立");
		expect(html).toContain("谁最先利用她的遗忘？");
	});
});

describe("ContractReviewView", () => {
	it("renders divergence points as questions back to the author", () => {
		const html = renderToStaticMarkup(
			<ContractReviewView
				review={{
					divergencePoints: [
						{
							field: "coreConflict",
							authorView: "她与既定命运对撞",
							editorView: "编辑版本的对撞描述",
							questionToAuthor: "命运具体以谁的行动出现？",
						},
					],
					feynmanVerdict: "partial",
					quoteAuthor: "她与既定命运对撞",
					reason: "核心冲突讲清了一半。",
					droppedPointCount: 1,
				}}
			/>,
		);

		expect(html).toContain("费曼点评");
		expect(html).toContain("只讲清了一半");
		expect(html).toContain("核心冲突");
		expect(html).toContain("命运具体以谁的行动出现？");
		expect(html).toContain("另有 1 条点评未能锚定");
	});
});
