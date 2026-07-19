import { describe, expect, it } from "vitest";

import type { QuickReviewResult } from "@/stores/workspace-store";
import { buildAnnotatedParagraphs, getAnnotatedIssueIds } from "./ProjectCurrentPage";

type QuickReviewIssue = NonNullable<QuickReviewResult["issues"]>[number];

function buildIssue(
	id: string,
	quote: string,
	overrides?: Partial<QuickReviewIssue>,
): QuickReviewIssue {
	return {
		id,
		severity: "high",
		category: "pacing",
		title: "问题标题",
		description: "问题描述需要足够清晰。",
		evidence: [{ quote, locationHint: "正文", confidence: 0.9 }],
		readerImpact: "读者会看不清关键情绪和因果。",
		fixAction: "补足动作和情绪转折。",
		promptConstraint: "改稿时保留原始人物关系。",
		blocksNextStep: true,
		...overrides,
	};
}

describe("buildAnnotatedParagraphs", () => {
	it("should attach a marker only when evidence quote matches chapter text", () => {
		const annotations = buildAnnotatedParagraphs(
			["第一段没有问题。", "她推开门，看见红色被子。", "第三段结束。"].join("\n\n"),
			[buildIssue("issue-1", "她推开门")],
		);

		expect(annotations[0]?.markers).toHaveLength(0);
		expect(annotations[1]?.markers).toMatchObject([
			{
				issue: { id: "issue-1" },
				issueIndex: 0,
				start: 0,
				end: 4,
			},
		]);
		expect(getAnnotatedIssueIds(annotations).has("issue-1")).toBe(true);
	});

	it("should not pin unmatched issues to the first paragraphs", () => {
		const annotations = buildAnnotatedParagraphs(
			["第一段没有问题。", "第二段也没有相关证据。"].join("\n\n"),
			[
				buildIssue("issue-1", "不存在于正文的证据 A"),
				buildIssue("issue-2", "不存在于正文的证据 B", { severity: "critical" }),
			],
		);

		expect(annotations.flatMap((annotation) => annotation.markers)).toHaveLength(0);
		expect(getAnnotatedIssueIds(annotations).size).toBe(0);
	});
});
