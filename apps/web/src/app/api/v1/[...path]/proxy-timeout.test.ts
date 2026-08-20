import { describe, expect, it } from "vitest";

import {
	DEFAULT_UPSTREAM_TIMEOUT_MS,
	MODEL_UPSTREAM_TIMEOUT_MS,
	PROVIDER_TEST_TIMEOUT_MS,
	resolveProxyTimeoutMs,
} from "./proxy-timeout";

describe("resolveProxyTimeoutMs", () => {
	it("gives every analysis endpoint except provider the model timeout", () => {
		for (const path of [
			["analysis", "premise-review"],
			["analysis", "premise-consult"],
			["analysis", "report-divergence"],
			["analysis", "report-qa"],
			["analysis", "quick-review"],
			["analysis", "book", "uploads"],
			["analysis", "workspace", "premise-dialogue", "start"],
			["analysis", "workspace", "revision-sessions", "id-1", "retest"],
			["analysis", "model-usage", "events"],
		]) {
			expect(resolveProxyTimeoutMs(path)).toBe(MODEL_UPSTREAM_TIMEOUT_MS);
		}
	});

	it("keeps the short provider-test timeout and the provider default", () => {
		expect(resolveProxyTimeoutMs(["analysis", "provider", "test"])).toBe(
			PROVIDER_TEST_TIMEOUT_MS,
		);
		expect(resolveProxyTimeoutMs(["analysis", "provider", "presets"])).toBe(
			DEFAULT_UPSTREAM_TIMEOUT_MS,
		);
	});

	it("keeps the default timeout for non-analysis paths", () => {
		expect(resolveProxyTimeoutMs(["auth", "login"])).toBe(DEFAULT_UPSTREAM_TIMEOUT_MS);
	});
});
