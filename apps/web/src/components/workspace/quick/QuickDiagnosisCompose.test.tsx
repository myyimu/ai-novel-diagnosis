import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisCompose } from "./QuickDiagnosisCompose";

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
	quickReviewPreviousPrompt: "",
	quickReviewCoreSellingPoint: "",
	quickReviewMustKeepMechanisms: "",
	quickReviewTargetReaderPleasures: "",
	chapterText: "",
	chapterTitle: "",
	projectRevisionSessions: [],
	projectMethodologyCards: [],
	bookTitle: "",
	bookGenre: "",
	bookText: "",
	bookFile: null,
	bookUpload: null,
	quickReviewCacheHit: false,
	handleChapterTextChange: vi.fn(),
	setQuickReviewGenre: vi.fn(),
	setQuickReviewInputKind: vi.fn(),
	setQuickReviewPreviousPrompt: vi.fn(),
	setQuickReviewCoreSellingPoint: vi.fn(),
	setQuickReviewMustKeepMechanisms: vi.fn(),
	setQuickReviewTargetReaderPleasures: vi.fn(),
	runQuickExperience: vi.fn(),
	useExampleChapter: vi.fn(),
	openView: vi.fn(),
	diagnosisExampleOptions: [],
};

describe("QuickDiagnosisCompose", () => {
	it("renders the quick diagnosis input state inside the new task frame", () => {
		const html = renderToStaticMarkup(<QuickDiagnosisCompose handlers={baseHandlers} />);

		expect(html).toContain("快速诊断");
		expect(html).toContain("快速诊断一章");
		expect(html).toContain("至少 50 字");
		expect(html).toContain("自动判断");
		expect(html).toContain("本地演示");
		expect(html).toContain("章节诊断");
		expect(html).not.toContain("书籍上传");
		expect(html).not.toContain("AI 提供商设置");
	});
});
