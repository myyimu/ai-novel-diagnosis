import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-workspace-handlers", () => ({
	useWorkspaceHandlers: () => ({
		providerLabel: "本地演示",
		loading: null,
		quickReviewResult: null,
		referenceTitle: "成熟样本",
		referenceText: "参考文本",
		chapterTitle: "第一章",
		chapterText: "主角被退婚后转身离开。",
		rubricResult: null,
		scoreResult: null,
		scoreEvidenceChain: {
			items: [],
			summary: "尚未完成评分，无法形成证据链。",
			weakest: undefined,
		},
		rubricCacheHit: false,
		scoreCacheHit: false,
		handleReferenceTextChange: vi.fn(),
		importReferenceFile: vi.fn(),
		buildRubric: vi.fn(),
		scoreChapter: vi.fn(),
		useExampleChapter: vi.fn(),
		diagnosisExampleOptions: [],
	}),
}));

import { DeepDiagnosisPage } from "./DeepDiagnosisPage";

describe("DeepDiagnosisPage", () => {
	it("renders the deep diagnosis workspace shell", () => {
		const html = renderToStaticMarkup(<DeepDiagnosisPage />);

		expect(html).toContain("深度质检");
		expect(html).toContain("参考资料、评分标准和评分结果按步骤推进");
		expect(html).toContain("深度质检步骤");
		expect(html).toContain("本地演示");
		expect(html).not.toContain("步骤检查器");
	});
});
