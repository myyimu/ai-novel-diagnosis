import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postForm } from "./api-client";

describe("api client", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("does not retry a non-idempotent upload while the local API proxy is restarting", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ code: -1, message: "temporarily unavailable", data: null }),
					{
						status: 502,
						headers: { "x-api-proxy-error": "upstream-unavailable" },
					},
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ code: 0, message: "success", data: { id: "upload-1" } }),
					{ headers: { "content-type": "application/json" } },
				),
			);

		await expect(
			postForm<{ id: string }>("/analysis/book/uploads", new FormData()),
		).rejects.toThrow("Request failed: 502");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
