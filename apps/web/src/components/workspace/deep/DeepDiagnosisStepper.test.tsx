import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DeepDiagnosisStepper } from "./DeepDiagnosisStepper";

const baseEvidenceChain = {
	items: [
		{
			id: "score-1",
			metricName: "开局钩子",
			score: 7,
			level: "medium",
			evidence: "主角被退婚后转身离开。",
			reason: "开局有冲突。",
			fix: "补强代价。",
			promptConstraint: "围绕「开局钩子」执行：补强代价。",
		},
	],
	summary: "1 个评分指标已转成证据链，最低项是「开局钩子」。",
	weakest: {
		id: "score-1",
		metricName: "开局钩子",
		score: 7,
		level: "medium",
		evidence: "主角被退婚后转身离开。",
		reason: "开局有冲突。",
		fix: "补强代价。",
		promptConstraint: "围绕「开局钩子」执行：补强代价。",
	},
};

describe("DeepDiagnosisStepper", () => {
	it("renders the sequential deep diagnosis flow", () => {
		const html = renderToStaticMarkup(
			<DeepDiagnosisStepper
				loading={false}
				quickReviewResult={null}
				referenceText=""
				referenceTitle=""
				chapterTitle="第一章"
				chapterText="主角被退婚后转身离开。"
				rubricResult={null}
				scoreResult={null}
				scoreEvidenceChain={baseEvidenceChain as never}
				hasRubricCache={false}
				hasScoreCache={false}
				onReferenceTextChange={vi.fn()}
				onImportReferenceFile={vi.fn()}
				onBuildRubric={vi.fn()}
				onScoreChapter={vi.fn()}
				onRebuildRubric={vi.fn()}
				onRescoreChapter={vi.fn()}
				diagnosisExampleOptions={[
					{
						id: "example-1",
						label: "示例章节",
						description: "示例说明",
						genre: "xuanhuan",
						inputKind: "human-draft",
						chapterTitle: "示例章",
						chapterText: "示例文本",
						previousPrompt: "",
						topIssueCategory: "hook",
						nextAction: "继续打磨",
					},
				]}
				onUseExampleChapter={vi.fn()}
			/>,
		);

		expect(html).toContain("选参考样本并拆出标准信号");
		expect(html).toContain("尚未提供参考资料");
		expect(html).toContain("生成评分标准");
		expect(html).toContain("开始评分");
		expect(html).toContain("质检发现");
		expect(html).not.toContain("右侧证据检查器");
		expect(html).toContain("示例章节");
	});

	it("blocks scoring before rubric is ready", () => {
		const html = renderToStaticMarkup(
			<DeepDiagnosisStepper
				loading={false}
				quickReviewResult={null}
				referenceText="参考文本"
				referenceTitle="成熟样本"
				chapterTitle="第一章"
				chapterText="主角被退婚后转身离开。"
				rubricResult={null}
				scoreResult={null}
				scoreEvidenceChain={baseEvidenceChain as never}
				hasRubricCache={false}
				hasScoreCache={false}
				onReferenceTextChange={vi.fn()}
				onImportReferenceFile={vi.fn()}
				onBuildRubric={vi.fn()}
				onScoreChapter={vi.fn()}
				onRebuildRubric={vi.fn()}
				onRescoreChapter={vi.fn()}
				diagnosisExampleOptions={[]}
				onUseExampleChapter={vi.fn()}
			/>,
		);

		expect(html).toContain("已导入参考资料");
		expect(html).toContain("生成评分标准");
		expect(html).toContain("评分必须在评分标准完成后进行");
	});
});

it("should enable rubric generation from reference text without a quick review", () => {
	const html = renderToStaticMarkup(
		<DeepDiagnosisStepper
			loading={false}
			quickReviewResult={null}
			referenceText={"参考正文".repeat(25)}
			referenceTitle=""
			chapterTitle="第一章"
			chapterText=""
			rubricResult={null}
			scoreResult={null}
			scoreEvidenceChain={{ items: [], summary: "", weakest: undefined }}
			hasRubricCache={false}
			hasScoreCache={false}
			onReferenceTextChange={vi.fn()}
			onImportReferenceFile={vi.fn()}
			onBuildRubric={vi.fn()}
			onScoreChapter={vi.fn()}
			onRebuildRubric={vi.fn()}
			onRescoreChapter={vi.fn()}
			diagnosisExampleOptions={[]}
			onUseExampleChapter={vi.fn()}
			status="服务暂时不可用，请重试"
		/>,
	);
	const buttons = html.match(/<button[^>]*>生成评分标准<\/button>/g) ?? [];
	expect(buttons).toHaveLength(2);
	expect(buttons.every((button) => !/\sdisabled(?:=|\s|>)/.test(button))).toBe(true);
	expect(html).toContain('href="#deep-findings"');
	expect(html).toContain('id="deep-findings"');
	expect(html).toContain('role="status"');
	expect(html).toContain("服务暂时不可用，请重试");
	expect(html).toMatch(/<button[^>]*disabled[^>]*>开始评分<\/button>/);
});
