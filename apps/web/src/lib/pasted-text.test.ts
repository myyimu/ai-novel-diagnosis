import { describe, expect, it } from "vitest";
import {
	countLikelyChapterHeadings,
	looksLikeMarkdownText,
	markdownToPlainText,
	replaceTextSelection,
} from "./pasted-text";

describe("pasted text helpers", () => {
	it("detects and converts markdown pasted from editors", () => {
		const markdown = [
			"# 第一章 开局",
			"",
			"主角被 **取消资格**。",
			"",
			"- 旁人嘲笑",
			"- 考官施压",
			"",
			"[备注](https://example.com)",
		].join("\n");

		expect(looksLikeMarkdownText(markdown)).toBe(true);
		expect(markdownToPlainText(markdown)).toContain("第一章 开局");
		expect(markdownToPlainText(markdown)).toContain("主角被 取消资格。");
		expect(markdownToPlainText(markdown)).toContain("旁人嘲笑");
		expect(markdownToPlainText(markdown)).toContain("备注");
		expect(markdownToPlainText(markdown)).not.toContain("**");
		expect(markdownToPlainText(markdown)).not.toContain("https://example.com");
	});

	it("counts obvious Chinese chapter headings", () => {
		const text = [
			"# 第一章 开局",
			"主角被取消资格。",
			"",
			"第 2 章 旧案",
			"主角发现玉牌线索。",
			"",
			"章节3 风雨来",
			"敌人登门。",
		].join("\n");

		expect(countLikelyChapterHeadings(text)).toBe(3);
	});

	it("replaces the selected text range", () => {
		expect(replaceTextSelection("开头结尾", "中段", 2, 2)).toBe("开头中段结尾");
		expect(replaceTextSelection("开头旧内容结尾", "新", 2, 5)).toBe("开头新结尾");
	});
});
