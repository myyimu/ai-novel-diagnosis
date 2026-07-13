const markdownSignals = [
	/^#{1,6}\s+\S/m,
	/```[\s\S]*?```/,
	/!\[[^\]]*]\([^)]+\)/,
	/\[[^\]]+]\([^)]+\)/,
	/\*\*[^*\n]+\*\*/,
	/^\s*>\s+\S/m,
	/^\s*[-*+]\s+\S/m,
	/^\s*\d+[.)]\s+\S/m,
	/^\s*\|.+\|\s*$/m,
];

const chapterHeadingPattern =
	/^\s*(?:#{1,6}\s*)?(?:(?:第\s*[零〇一二两三四五六七八九十百千万\d]+\s*[章节回卷部集][^\n]{0,60})|(?:章节\s*[零〇一二两三四五六七八九十百千万\d]+[^\n]{0,60})|(?:Chapter\s+\d+[^\n]{0,60})|(?:\d{1,4}[、.．]\s*[^\n]{1,60}))\s*$/gim;

export function looksLikeMarkdownText(text: string) {
	const sample = text.trim();
	if (!sample) {
		return false;
	}

	return markdownSignals.filter((pattern) => pattern.test(sample)).length > 0;
}

export function markdownToPlainText(text: string) {
	return text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n?/g, "\n")
		.replace(/```[\w-]*\n?/g, "")
		.replace(/```/g, "")
		.replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
		.replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
		.replace(/^#{1,6}\s*/gm, "")
		.replace(/^\s*>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/^\s*\d+[.)]\s+/gm, "")
		.replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "")
		.replace(/^\s*\|(.+)\|\s*$/gm, (_, cells: string) =>
			String(cells)
				.split("|")
				.map((cell) => cell.trim())
				.filter(Boolean)
				.join("  "),
		)
		.replace(/<\/?[^>]+>/g, "")
		.replace(/(\*\*|__)(.*?)\1/g, "$2")
		.replace(/(\*|_)(.*?)\1/g, "$2")
		.replace(/~~(.*?)~~/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/[ \t]+$/gm, "")
		.replace(/\n{4,}/g, "\n\n\n")
		.trim();
}

export function countLikelyChapterHeadings(text: string) {
	return [...text.matchAll(chapterHeadingPattern)].length;
}

export function replaceTextSelection(
	value: string,
	insertedText: string,
	selectionStart: number | null | undefined,
	selectionEnd: number | null | undefined,
) {
	const start =
		typeof selectionStart === "number" && selectionStart >= 0 ? selectionStart : value.length;
	const end = typeof selectionEnd === "number" && selectionEnd >= start ? selectionEnd : start;

	return `${value.slice(0, start)}${insertedText}${value.slice(end)}`;
}
