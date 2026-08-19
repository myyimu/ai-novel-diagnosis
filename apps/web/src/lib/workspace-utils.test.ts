import { describe, expect, it } from "vitest";

import { getLastCompletedChapterLabel } from "./workspace-utils";
import type { BookAnalysisJob } from "@/stores/workspace-types";

function jobWithPartial(partial: BookAnalysisJob["partialResult"]): BookAnalysisJob {
	return {
		id: "book_testid1234_ab",
		type: "book-map-reduce-analysis",
		status: "running",
		inputSummary: { title: "测试书", genre: "other", textLength: 1200 },
		progress: { stage: "map", current: 3, total: 10, message: "processing" },
		partialResult: partial,
	};
}

describe("getLastCompletedChapterLabel", () => {
	it("labels a deep chapter completion with its title", () => {
		const label = getLastCompletedChapterLabel(
			jobWithPartial({
				partial: true,
				type: "book-map-reduce-partial",
				stage: "map",
				savedAt: "2026-08-19T00:00:00.000Z",
				mapCount: 11,
				totalChapters: 10,
				artifactDir: "tmp/job-1",
				notice: "Deep analysis 2/3 completed.",
				lastCompletedChapter: {
					order: 5,
					title: "第五章 风起",
					phase: "deep",
					completedAt: "2026-08-19T00:00:01.000Z",
				},
			}),
		);

		expect(label).toBe("第五章 风起（深拆）");
	});

	it("labels an outline completion as light indexing", () => {
		const label = getLastCompletedChapterLabel(
			jobWithPartial({
				partial: true,
				type: "book-map-reduce-partial",
				stage: "map",
				savedAt: "2026-08-19T00:00:00.000Z",
				mapCount: 2,
				totalChapters: 10,
				artifactDir: "tmp/job-1",
				notice: "Outline index 2/10 completed.",
				lastCompletedChapter: {
					order: 2,
					title: "第 2 章",
					phase: "outline",
					completedAt: "2026-08-19T00:00:01.000Z",
				},
			}),
		);

		expect(label).toBe("第 2 章（轻索引）");
	});

	it("returns null before any real chapter event arrives", () => {
		expect(getLastCompletedChapterLabel(null)).toBeNull();
		expect(
			getLastCompletedChapterLabel(
				jobWithPartial({
					partial: true,
					type: "book-map-reduce-partial",
					stage: "map",
					savedAt: "2026-08-19T00:00:00.000Z",
					mapCount: 0,
					totalChapters: 10,
					artifactDir: "tmp/job-1",
					notice: "Outline index 0/10 completed.",
				}),
			),
		).toBeNull();
	});
});
