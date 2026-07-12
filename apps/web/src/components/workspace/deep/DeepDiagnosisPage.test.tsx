import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

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
		expect(html).toContain("参考样本 → 标准 → 评分");
		expect(html).toContain("选参考样本并拆出标准信号");
		expect(html).toContain("质检发现");
		expect(html).toContain("本地演示");
		expect(html).not.toContain("步骤检查器");
	});
});
