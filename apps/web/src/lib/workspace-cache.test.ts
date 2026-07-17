import { describe, expect, it } from "vitest";
import { buildBookAnalysisCacheKey } from "./workspace-cache";
import type { ProviderForm } from "@/stores/workspace-store";

const provider: ProviderForm = {
	preset: "shared-gpu",
	kind: "openai-compatible",
	baseUrl: "",
	apiKey: "",
	model: "",
	temperature: 0.2,
	jsonMode: false,
};

const baseKeyInput = {
	provider,
	bookGenre: "xuanhuan",
	bookTitle: "示例长篇",
	bookText: "正文内容。",
	bookFile: null,
};

describe("buildBookAnalysisCacheKey", () => {
	it("includes purpose, profiles, schema and prompt version", () => {
		const key = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "own-draft",
			profiles: ["statistics", "continuity"],
		});

		expect(key).toContain("story-audit.v1");
		expect(key).toContain("own-draft");
		expect(key).toContain("continuity,statistics");
	});

	it("defaults purpose to reference-study for backward compatibility", () => {
		const key = buildBookAnalysisCacheKey(baseKeyInput);

		expect(key).toContain("reference-study");
	});

	it("distinguishes own-draft from reference-study", () => {
		const ownDraft = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "own-draft",
		});
		const reference = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "reference-study",
		});

		expect(ownDraft).not.toBe(reference);
	});

	it("treats profile sets as order-independent", () => {
		const ordered = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "own-draft",
			profiles: ["statistics", "continuity"],
		});
		const reversed = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "own-draft",
			profiles: ["continuity", "statistics"],
		});

		expect(ordered).toBe(reversed);
	});

	it("distinguishes different profile sets", () => {
		const withContinuity = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "own-draft",
			profiles: ["statistics", "continuity"],
		});
		const withoutContinuity = buildBookAnalysisCacheKey({
			...baseKeyInput,
			purpose: "own-draft",
			profiles: ["statistics"],
		});

		expect(withContinuity).not.toBe(withoutContinuity);
	});
});
