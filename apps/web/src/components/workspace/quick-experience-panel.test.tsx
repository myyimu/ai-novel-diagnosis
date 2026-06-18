import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QuickExperiencePanel } from "./quick-experience-panel";

describe("QuickExperiencePanel", () => {
	it("renders the quick review entry without result", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={false}
				elapsedSeconds={0}
				quickReviewResult={null}
				onChapterTextChange={vi.fn()}
				onRun={vi.fn()}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("快速点评");
		expect(html).toContain("当前 AI：免费共享算力");
		expect(html).toContain("生成快速点评");
	});

	it("renders quick review result when provided", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={false}
				elapsedSeconds={0}
				quickReviewResult={{
					title: "第一章 退婚",
					genre: "xuanhuan",
					positioning: "典型玄幻废柴流开局",
					sellingPoints: ["反转感强", "目标明确"],
					mainProblem: "冲突压力不足",
					actionableFixes: ["补一句失败代价", "前置目标", "加结尾钩子"],
					readyForFullReview: true,
					readyReason: "文本量足够，适合做完整评分",
					quickScore: 6.5,
					confidence: 0.82,
				}}
				onChapterTextChange={vi.fn()}
				onRun={vi.fn()}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("6.5/10");
		expect(html).toContain("典型玄幻废柴流开局");
		expect(html).toContain("冲突压力不足");
		expect(html).toContain("补一句失败代价");
		expect(html).toContain("生成评分标准并详细打分");
		expect(html).toContain("拆解整本书");
	});

	it("falls back when the model returns an incomplete result", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={false}
				elapsedSeconds={0}
				quickReviewResult={
					{
						quickScore: 6,
						confidence: 0.6,
					} as never
				}
				onChapterTextChange={vi.fn()}
				onRun={vi.fn()}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("6/10");
		expect(html).toContain("类型待确认");
		expect(html).toContain("模型没有返回明确卖点");
		expect(html).toContain("模型没有返回具体改法");
	});

	it("renders visible progress while waiting for a quick review", () => {
		const html = renderToStaticMarkup(
			<QuickExperiencePanel
				chapterText="主角被公开否定，却发现旧案信物。"
				providerLabel="免费共享算力"
				loading={true}
				elapsedSeconds={21}
				quickReviewResult={null}
				onChapterTextChange={vi.fn()}
				onRun={vi.fn()}
				onUseExample={vi.fn()}
				onOpenModel={vi.fn()}
				onOpenCritique={vi.fn()}
				onOpenBook={vi.fn()}
			/>,
		);

		expect(html).toContain("等待模型返回");
		expect(html).toContain("已等待 21 秒");
	});
});
