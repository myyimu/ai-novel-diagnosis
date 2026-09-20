import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { chapterGuidanceModes, type ChapterGuidanceMode } from "@ai-novel-diagnosis/ai-core";
import { ChapterGuidanceModeSelect } from "./ChapterGuidanceModeSelect";

describe("ChapterGuidanceModeSelect", () => {
	it.each(Object.keys(chapterGuidanceModes) as ChapterGuidanceMode[])(
		"should show the matching explanation and example when %s is selected",
		(value) => {
			const html = renderToStaticMarkup(
				<ChapterGuidanceModeSelect
					value={value}
					disabled={false}
					onChange={() => undefined}
				/>,
			);
			expect(html.match(/<option /g)).toHaveLength(8);
			expect(html).toContain(`value="${value}" selected=""`);
			expect(html).toContain(chapterGuidanceModes[value].description);
			expect(html).toContain(chapterGuidanceModes[value].example);
			expect(html).toContain("aria-describedby=");
		},
	);
	it("should disable mode switching when a response is in progress", () => {
		const html = renderToStaticMarkup(
			<ChapterGuidanceModeSelect value="auto" disabled onChange={() => undefined} />,
		);
		expect(html).toMatch(/<select[^>]*disabled=""/);
	});
});
