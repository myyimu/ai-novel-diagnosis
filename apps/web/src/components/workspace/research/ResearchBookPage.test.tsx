import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchBookPage } from "./ResearchBookPage";

const { handlers } = vi.hoisted(() => ({
	handlers: {
		bookFile: null,
		bookTitle: "测试剧本",
		bookText: "",
		bookUpload: { id: "upload-script", chapterCount: 1, preprocessing: { chapters: [] } },
		uploadHistory: [],
		bookJob: {
			id: "job-script",
			status: "failed",
			progress: { stage: "failed", current: 1, total: 2, message: "失败" },
		},
		bookAnalysisResult: { mode: "partial" },
		bookStatusText: "模型返回失败",
		bookProgressDetail: null,
		loading: null,
		providerLabel: "测试模型",
		setBookTitle: vi.fn(),
		setBookText: vi.fn(),
		analyzeBook: vi.fn(),
		dismissRunningBookJob: vi.fn(),
		uploadBookForPreview: vi.fn(),
		readBookFile: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-workspace-handlers", () => ({ useWorkspaceHandlers: () => handlers }));

describe("ResearchBookPage", () => {
	beforeEach(() => {
		handlers.bookJob.status = "failed";
	});
	it("labels a failed job's retained output as partial instead of completed", () => {
		const html = renderToStaticMarkup(<ResearchBookPage />);
		expect(html).toContain("任务失败");
		expect(html).toContain("已保留的部分分析结果");
		expect(html).not.toContain("整本分析完成</h3>");
	});
	it("shows completion only for successful jobs", () => {
		handlers.bookJob.status = "succeeded";
		const html = renderToStaticMarkup(<ResearchBookPage />);
		expect(html).toContain("整本分析完成</h3>");
		expect(html).not.toContain("已保留的部分分析结果");
	});
	it("allows analysis of a restored upload without requiring the original browser File", () => {
		const html = renderToStaticMarkup(<ResearchBookPage />);
		expect(html).toMatch(/<button[^>]*>重新分析<\/button>/);
		expect(html).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>重新分析<\/button>/);
		expect(html).toContain('aria-label="整书正文"');
	});
});
