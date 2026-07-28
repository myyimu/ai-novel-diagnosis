import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { QuickReviewResult } from "@/stores/workspace-store";
import {
	AnnotatedParagraph,
	buildAnnotatedParagraphs,
	buildRevisionIssueDecisions,
	buildVisibleIssueEntries,
	getChapterDiagnosisRunCopy,
	getAnnotatedIssueIds,
	TreeAssetRow,
} from "./ProjectCurrentPage";

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

	it("should render a marker number at the lower-right corner of its anchored evidence", () => {
		const [annotation] = buildAnnotatedParagraphs("证据内容。后续正文。", [
			buildIssue("issue-1", "证据内容"),
		]);
		const html = renderToStaticMarkup(
			<AnnotatedParagraph annotation={annotation!} onFocusIssue={() => undefined} />,
		);

		expect(html).toContain("-bottom-2");
		expect(html).toMatch(/证据内容.*>1<\/span><\/button>。后续正文/);
	});
});

describe("buildVisibleIssueEntries", () => {
	it("should keep every pending issue visible instead of truncating the list", () => {
		const issues = Array.from({ length: 8 }, (_, index) =>
			buildIssue(`issue-${index + 1}`, `证据 ${index + 1}`),
		);

		const entries = buildVisibleIssueEntries(issues, () => "pending", "all");

		expect(entries).toHaveLength(8);
		expect(entries.at(-1)?.issue.id).toBe("issue-8");
	});

	it("should preserve original issue numbers after filtering", () => {
		const issues = [
			buildIssue("issue-1", "证据 1", { severity: "high" }),
			buildIssue("issue-2", "证据 2", { severity: "critical" }),
			buildIssue("issue-3", "证据 3", { severity: "critical" }),
		];

		const entries = buildVisibleIssueEntries(issues, () => "pending", "must");

		expect(entries.map((entry) => entry.index)).toEqual([1, 2]);
	});
});

describe("buildRevisionIssueDecisions", () => {
	it("should record author intent and distinguish an adopted rewrite from acceptance", () => {
		const decisions = buildRevisionIssueDecisions(
			[
				buildIssue("issue-1", "证据 1"),
				buildIssue("issue-2", "证据 2"),
				buildIssue("issue-3", "证据 3"),
			],
			{
				"issue-1": "accepted",
				"issue-2": "ignored",
				"issue-3": "disputed",
			},
			new Set(["issue-1"]),
		);

		expect(decisions).toEqual([
			expect.objectContaining({ issueId: "issue-1", decision: "accepted", adopted: true }),
			expect.objectContaining({
				issueId: "issue-2",
				decision: "author_intent",
				adopted: false,
			}),
			expect.objectContaining({
				issueId: "issue-3",
				decision: "false_positive",
				adopted: false,
			}),
		]);
	});
});

describe("getChapterDiagnosisRunCopy", () => {
	it("should distinguish a first diagnosis from a retest run", () => {
		expect(getChapterDiagnosisRunCopy(false)).toMatchObject({
			title: "正在生成诊断",
		});
		expect(getChapterDiagnosisRunCopy(true)).toMatchObject({
			title: "正在进行复诊",
		});
	});
});

describe("TreeAssetRow", () => {
	it("should render a keyboard-accessible button for a project asset", () => {
		const html = renderToStaticMarkup(
			<TreeAssetRow label="修改效果" value={20} onClick={() => undefined} />,
		);

		expect(html).toContain("<button");
		expect(html).toContain("修改效果");
		expect(html).toContain(">20<");
	});
});
