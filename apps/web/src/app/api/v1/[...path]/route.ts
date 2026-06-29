import type { NextRequest } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"content-length",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
]);

const PROXY_REQUEST_TIMEOUT_MS = 20_000;
const UPSTREAM_REQUEST_TIMEOUT_MS = 30_000;

type RouteContext = {
	params: Promise<{
		path: string[];
	}>;
};

type ProxyRequestInit = RequestInit & {
	duplex?: "half";
};

function getApiBaseUrl() {
	return (process.env.API_INTERNAL_BASE_URL ?? "http://localhost:3001/api/v1").replace(
		/\/+$/,
		"",
	);
}

function createProxyHeaders(request: NextRequest) {
	const headers = new Headers(request.headers);
	for (const name of HOP_BY_HOP_HEADERS) {
		headers.delete(name);
	}
	headers.set("x-forwarded-host", request.headers.get("host") ?? "");
	headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
	return headers;
}

function createResponseHeaders(headers: Headers) {
	const responseHeaders = new Headers(headers);
	for (const name of HOP_BY_HOP_HEADERS) {
		responseHeaders.delete(name);
	}
	return responseHeaders;
}

function buildProxyTimeoutError(message = "request timeout") {
	return JSON.stringify({
		code: -1,
		message,
		data: null,
	});
}

function isAbortError(error: unknown): error is DOMException {
	return error instanceof DOMException && error.name === "AbortError";
}

function isProviderTestPath(path: string[]) {
	return (
		path.length >= 3 && path[0] === "analysis" && path[1] === "provider" && path[2] === "test"
	);
}

async function proxy(request: NextRequest, context: RouteContext) {
	const { path } = await context.params;
	const upstreamUrl = new URL(`${getApiBaseUrl()}/${path.map(encodeURIComponent).join("/")}`);
	upstreamUrl.search = request.nextUrl.search;
	const timeoutMs = isProviderTestPath(path)
		? PROXY_REQUEST_TIMEOUT_MS
		: UPSTREAM_REQUEST_TIMEOUT_MS;

	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const init: ProxyRequestInit = {
		method: request.method,
		headers: createProxyHeaders(request),
		redirect: "manual",
		body: hasBody ? request.body : undefined,
		duplex: hasBody ? "half" : undefined,
	};

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort(new DOMException("Request timeout", "AbortError"));
	}, timeoutMs);

	try {
		const response = await fetch(upstreamUrl, {
			...init,
			signal: controller.signal,
		});
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: createResponseHeaders(response.headers),
		});
	} catch (error) {
		if (isAbortError(error)) {
			const timeoutMessage = isProviderTestPath(path)
				? "Provider test timed out, please check API service reachability or retry later"
				: "Request timed out, please retry later";
			return new Response(buildProxyTimeoutError(timeoutMessage), {
				status: 504,
				headers: {
					"content-type": "application/json",
				},
			});
		}

		return new Response(
			JSON.stringify({
				code: -1,
				message: "Provider test proxy failed. Check network or server status",
				data: null,
			}),
			{
				status: 502,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	} finally {
		clearTimeout(timeoutId);
	}
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
