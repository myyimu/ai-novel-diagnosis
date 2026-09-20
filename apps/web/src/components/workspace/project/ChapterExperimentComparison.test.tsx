import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChapterExperiment } from "@ai-novel-diagnosis/ai-core";
import { ChapterExperimentComparison } from "./ChapterExperimentComparison";
import { experimentVersionLabel } from "@/lib/chapter-experiments";

describe("ChapterExperimentComparison", () => {
	const experiment: ChapterExperiment = {
		id: "trial",
		projectId: "book",
		chapterTitle: "chapter",
		originalText: "原稿正文",
		goal: "目标",
		preserve: "保留",
		context: "",
		revision: 1,
		createdAt: "now",
		turns: [],
		plan: "修改",
		writerFingerprint: null,
		versions: [
			{
				id: "v1",
				route: "guided",
				round: 1,
				parentId: "original",
				text: "新稿正文",
				createdAt: "now",
				elapsedMs: 1000,
				modelLabel: "model",
			},
		],
		decisions: [],
	};
	it("should offer original and intermediate versions without declaring a winner when no decision exists", () => {
		const html = renderToStaticMarkup(
			<ChapterExperimentComparison
				experiment={experiment}
				busy={false}
				act={async () => true}
				onLoad={() => undefined}
				currentText="原稿正文"
			/>,
		);
		expect(html).toContain("原稿 V0");
		expect(html).toContain("引导改稿 · 第 1 轮");
		expect(html).toContain("打乱顺序，开始阅读");
		expect(html).not.toContain("新稿正文");
		expect(experimentVersionLabel(experiment, "missing")).toBe("未知版本");
	});
	it("should show inconclusive human decisions when the reader cannot distinguish versions", () => {
		const html = renderToStaticMarkup(
			<ChapterExperimentComparison
				experiment={{
					...experiment,
					decisions: [
						{
							leftId: "original",
							rightId: "v1",
							choice: "uncertain",
							reason: "风格不同，无法判断是否更好",
							createdAt: "now",
						},
					],
				}}
				busy={false}
				act={async () => true}
				onLoad={() => undefined}
				currentText="原稿正文"
			/>,
		);
		expect(html).toContain("风格不同，无法判断是否更好");
		expect(html).toContain("无法判断");
	});
});
