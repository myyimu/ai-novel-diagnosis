import { describe, expect, it } from "vitest";

import { getResearchWorkspaceNav } from "./ResearchWorkspaceShell";

describe("getResearchWorkspaceNav", () => {
	it("marks only the selected research page as active", () => {
		const pages = getResearchWorkspaceNav("materials");

		expect(pages).toHaveLength(4);
		expect(pages.filter((page) => page.isActive).map((page) => page.id)).toEqual(["materials"]);
		expect(pages.map((page) => page.href)).toEqual([
			"/research/book",
			"/research/compare",
			"/research/patterns",
			"/research/materials",
		]);
	});
});
