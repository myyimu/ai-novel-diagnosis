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

const baseInput = {
	provider,
	bookGenre: "xuanhuan",
	bookTitle: "示例长篇",
	bookText: "正文内容。",
	bookFile: null,
};

describe("buildBookAnalysisCacheKey", () => {
	it("separates own-draft audits by their profile set", () => {
		const withContinuity = buildBookAnalysisCacheKey({
			...baseInput,
			purpose: "own-draft",
			profiles: ["statistics", "continuity"],
		});
		const withoutContinuity = buildBookAnalysisCacheKey({
			...baseInput,
			purpose: "own-draft",
			profiles: ["statistics"],
		});

		expect(withContinuity).not.toBe(withoutContinuity);
	});

	it("uses a stable profile order and distinguishes reference studies", () => {
		const ordered = buildBookAnalysisCacheKey({
			...baseInput,
			purpose: "own-draft",
			profiles: ["statistics", "continuity"],
		});
		const reversed = buildBookAnalysisCacheKey({
			...baseInput,
			purpose: "own-draft",
			profiles: ["continuity", "statistics"],
		});
		const reference = buildBookAnalysisCacheKey(baseInput);

		expect(ordered).toBe(reversed);
		expect(ordered).not.toBe(reference);
	});
});
