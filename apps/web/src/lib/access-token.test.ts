import { describe, expect, it } from "vitest";
import { isValidBasicAuthorization } from "./access-token";

describe("isValidBasicAuthorization", () => {
	it("accepts a Basic header with the configured shared password", () => {
		const header = `Basic ${btoa("local:correct-password")}`;

		expect(isValidBasicAuthorization(header, "correct-password")).toBe(true);
	});

	it("rejects missing, malformed, and incorrect credentials", () => {
		expect(isValidBasicAuthorization(null, "password")).toBe(false);
		expect(isValidBasicAuthorization("Basic not-base64", "password")).toBe(false);
		expect(isValidBasicAuthorization(`Basic ${btoa("local:wrong")}`, "password")).toBe(false);
	});
});
