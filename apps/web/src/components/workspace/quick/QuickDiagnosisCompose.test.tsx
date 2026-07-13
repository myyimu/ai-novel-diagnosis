import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisCompose } from "./QuickDiagnosisCompose";

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

const baseHandlers = {
	provider: { kind: "mock" as const, model: "" },
	providerLabel: "本地演示",
	isBackendFreeProvider: true,
	loading: null,
	quickReviewElapsedSeconds: 0,
	quickReviewResult: null,
	quickReviewError: null,
	previousQuickReviewResult: null,
	quickReviewGenre: "",
	quickReviewInputKind: "human-draft" as const,
	quickReviewChapterPosition: "unknown" as const,
	quickReviewDiagnosticFocus: "为什么没人追读",
	quickReviewPreviousPrompt: "",
	quickReviewCoreSellingPoint: "",
	quickReviewMustKeepMechanisms: "",
	quickReviewTargetReaderPleasures: "",
	saveQuickReviewMethodology: false,
	chapterText: "",
	chapterTitle: "",
	projectRevisionSessions: [],
	projectMethodologyCards: [],
	bookTitle: "",
	setBookTitle: vi.fn(),
	bookGenre: "",
	bookText: "",
	bookFile: null,
	bookUpload: null,
	quickReviewCacheHit: false,
	handleChapterTextChange: vi.fn(),
	setQuickReviewGenre: vi.fn(),
	setQuickReviewInputKind: vi.fn(),
	setQuickReviewChapterPosition: vi.fn(),
	setQuickReviewDiagnosticFocus: vi.fn(),
	setQuickReviewPreviousPrompt: vi.fn(),
	setQuickReviewCoreSellingPoint: vi.fn(),
	setQuickReviewMustKeepMechanisms: vi.fn(),
	setQuickReviewTargetReaderPleasures: vi.fn(),
	setSaveQuickReviewMethodology: vi.fn(),
	setChapterTitle: vi.fn(),
	runQuickExperience: vi.fn(),
	useExampleChapter: vi.fn(),
	openView: vi.fn(),
	diagnosisExampleOptions: [],
};

describe("QuickDiagnosisCompose", () => {
	it("renders the quick diagnosis input state inside the new task frame", () => {
		const html = renderToStaticMarkup(<QuickDiagnosisCompose handlers={baseHandlers} />);

		expect(html).toContain("快速诊断");
		expect(html).toContain("聚焦一个问题");
		expect(html).toContain("输入稿件");
		expect(html).toContain("复制修改指令");
		expect(html).toContain("本地演示");
		expect(html).toContain("章节诊断");
		expect(html).not.toContain("书籍上传");
		expect(html).not.toContain("AI 提供商设置");
	});
});
