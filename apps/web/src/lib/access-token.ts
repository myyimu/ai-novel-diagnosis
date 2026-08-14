import { timingSafeEqual } from "node:crypto";

/** Validates the shared-password Basic Authorization header for self-hosting. */
export function isValidBasicAuthorization(
	authorization: string | null,
	accessToken: string,
): boolean {
	if (!authorization?.startsWith("Basic ")) {
		return false;
	}

	try {
		const decoded = atob(authorization.slice("Basic ".length));
		const separator = decoded.indexOf(":");
		if (separator < 0) {
			return false;
		}

		const providedKey = Buffer.from(decoded.slice(separator + 1), "utf8");
		const expectedKey = Buffer.from(accessToken, "utf-8");

		// timingSafeEqual throws if lengths differ; check first to avoid that.
		return (
			providedKey.length === expectedKey.length && timingSafeEqual(providedKey, expectedKey)
		);
	} catch {
		return false;
	}
}
