import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConsultResultView, PremiseConsultPanel } from "./PremiseConsultPanel";
import type { PremiseConsultResult, PremiseReviewResult } from "@ai-novel-diagnosis/ai-core";
import { defaultProvider } from "@/stores/workspace-types";

const premiseText =
	"主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流，最后站上颁奖礼揭穿当年背叛他的所有人。";

const reviewResult = {
	schemaVersion: "premise-review.v1",
	reviewId: "review-1",
	premiseSummary: "一个重生复仇兼流量收割的故事。",
	coreConflict: "主角想揭穿背叛者，而背叛者掌握他的舆论生死。",
	protagonistDesire: "避开前世的每一个遗憾。",
	opposingForce: "掌握流量与资源的背叛者们。",
	irreducibilityTest: "换成职场背景后两难仍然成立。",
	readerHookQuestion: "他这次会先原谅还是先揭穿？",
	engineVerdict: "not-worth-writing",
	oneLineVerdict: "欲望空泛，冲突缺位。",
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

const consultResult = {
	schemaVersion: "premise-consult.v1",
	consultId: "consult-1",
	mode: "model",
	trigger: "author-disagrees",
	original: {
		verdict: "not-worth-writing",
		oneLineVerdict: "欲望空泛，冲突缺位。",
		layers: reviewResult.layers,
	},
	second: {
		verdict: "solid",
		oneLineVerdict: "欲望具体且自带代价，值得写。",
		layers: reviewResult.layers.map((layer) => ({
			...layer,
			status: "established" as const,
		})),
		strongestArgument: "欲望具体且自带代价：前世记忆是资产也是把柄。",
		evidence: [{ quote: "带着前世记忆避开所有遗憾", note: "欲望具体" }],
	},
	comparison: {
		verdictRelation: "opposite",
		layerComparisons: reviewResult.layers.map((layer) => ({
			layer: layer.layer,
			originalStatus: layer.status,
			secondStatus: "established" as const,
			agrees: layer.status === "established",
		})),
		droppedEvidenceCount: 1,
	},
} satisfies PremiseConsultResult;

describe("PremiseConsultPanel", () => {
	it("renders the consult entry with the blind-review promise and both triggers", () => {
		const html = renderToStaticMarkup(
			<PremiseConsultPanel
				provider={defaultProvider}
				premiseText={premiseText}
				review={reviewResult}
			/>,
		);

		expect(html).toContain("第二审稿人会诊");
		expect(html).toContain("盲审");
		expect(html).toContain("不覆盖原判定");
		expect(html).toContain("我不服这个结论，申请会诊");
		expect(html).toContain("证据不足，请第二审稿人");
		expect(html).toContain("会诊只呈现两方各自的论证与锚定证据，不会替你裁决写不写");
	});

	it("suggests a consult with evidence-completeness wording when a layer is thin", () => {
		const html = renderToStaticMarkup(
			<PremiseConsultPanel
				provider={defaultProvider}
				premiseText={premiseText}
				review={reviewResult}
			/>,
		);

		expect(html).toContain("证据完整度只有 0.20");
		expect(html).toContain("不是正确率");
	});

	it("omits the low-evidence suggestion when every layer is well-evidenced", () => {
		const html = renderToStaticMarkup(
			<PremiseConsultPanel
				provider={defaultProvider}
				premiseText={premiseText}
				review={{
					...reviewResult,
					layers: reviewResult.layers.map((layer) => ({
						...layer,
						confidence: 0.9,
						status: "established" as const,
					})),
				}}
			/>,
		);

		expect(html).not.toContain("证据完整度只有");
		expect(html).toContain("我不服这个结论，申请会诊");
	});
});

describe("ConsultResultView", () => {
	it("presents both verdicts side by side with anchored evidence and the layer table", () => {
		const html = renderToStaticMarkup(<ConsultResultView result={consultResult} />);

		expect(html).toContain("两位审稿人结论相反");
		expect(html).toContain("由程序比对");
		expect(html).toContain("第一审稿人（先找理由拒绝）");
		expect(html).toContain("第二审稿人（最强成立论证）");
		expect(html).toContain("暂不值得写");
		expect(html).toContain("值得写");
		expect(html).toContain("最强成立论证：");
		expect(html).toContain("带着前世记忆避开所有遗憾");
		expect(html).toContain("四层审计对照");
		expect(html).toContain("分歧");
		expect(html).toContain("另有 1 条第二审稿人的引文未能");
		expect(html).toContain("不覆盖、不修改");
	});

	it("renders agreement without the dropped-evidence disclosure", () => {
		const agreeResult: PremiseConsultResult = {
			...consultResult,
			original: { ...consultResult.original, verdict: "solid" },
			comparison: {
				...consultResult.comparison,
				verdictRelation: "agree",
				layerComparisons: consultResult.comparison.layerComparisons.map((item) => ({
					...item,
					originalStatus: item.secondStatus,
					agrees: true,
				})),
				droppedEvidenceCount: 0,
			},
		};

		const html = renderToStaticMarkup(<ConsultResultView result={agreeResult} />);

		expect(html).toContain("两位审稿人结论一致");
		expect(html).not.toContain("未能");
	});

	it("discloses demo mode instead of passing the placeholder off as judgment", () => {
		const html = renderToStaticMarkup(
			<ConsultResultView result={{ ...consultResult, mode: "mock" }} />,
		);

		expect(html).toContain("演示模式");
		expect(html).toContain("不代表真实编辑判断");
	});

	it("confirms the consult entered the project record only when recordId is present", () => {
		const persisted = renderToStaticMarkup(
			<ConsultResultView result={{ ...consultResult, recordId: "record-1" }} />,
		);
		const unpersisted = renderToStaticMarkup(<ConsultResultView result={consultResult} />);

		expect(persisted).toContain("本次会诊已记入项目病历");
		expect(unpersisted).not.toContain("本次会诊已记入项目病历");
	});
});
