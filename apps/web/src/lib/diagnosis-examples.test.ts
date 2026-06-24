import { describe, expect, it } from "vitest";
import {
	diagnosisExampleOptions,
	findDiagnosisExampleByChapterText,
	getDiagnosisExampleOption,
} from "./diagnosis-examples";

describe("diagnosis examples", () => {
	it("exposes selectable examples with reusable golden reports", () => {
		expect(diagnosisExampleOptions).toHaveLength(3);
		expect(diagnosisExampleOptions.map((example) => example.genre)).toEqual([
			"xuanhuan",
			"urban",
			"romance",
		]);

		for (const example of diagnosisExampleOptions) {
			expect(example.chapterText.length).toBeGreaterThan(50);
			expect(example.result?.title).toBe(example.chapterTitle);
			expect(example.result?.issues?.[0]?.category).toBe(example.topIssueCategory);
			expect(example.result?.nextPrompt?.prompt.length).toBeGreaterThan(20);
		}
	});

	it("finds a golden report only for unchanged example text", () => {
		const example = getDiagnosisExampleOption("urban-prompt-too-vague");

		expect(findDiagnosisExampleByChapterText(example.chapterText)?.id).toBe(example.id);
		expect(
			findDiagnosisExampleByChapterText(`${example.chapterText}\n新增一句`),
		).toBeUndefined();
	});
});
