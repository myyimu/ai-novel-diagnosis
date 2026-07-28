import { NextResponse, type NextRequest } from "next/server";
import { isValidBasicAuthorization } from "@/lib/access-token";

function unauthorized(): NextResponse {
	return new NextResponse("Authentication required", {
		status: 401,
		headers: {
			"www-authenticate": 'Basic realm="AI novel diagnosis", charset="UTF-8"',
		},
	});
}

/**
 * Adds a shared-password boundary for the single-user Docker deployment.
 * Local development intentionally remains frictionless when no token is set.
 */
export function proxy(request: NextRequest): NextResponse {
	const accessToken = process.env.APP_ACCESS_TOKEN?.trim();
	if (!accessToken) {
		if (process.env.NODE_ENV === "production") {
			return new NextResponse("APP_ACCESS_TOKEN must be configured", {
				status: 503,
			});
		}
		return NextResponse.next();
	}

	return isValidBasicAuthorization(request.headers.get("authorization"), accessToken)
		? NextResponse.next()
		: unauthorized();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
