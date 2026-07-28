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
		return separator >= 0 && decoded.slice(separator + 1) === accessToken;
	} catch {
		return false;
	}
}
