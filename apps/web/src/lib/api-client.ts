export interface ApiEnvelope<T> {
	code: number;
	message: string;
	data: T;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

type ApiRequestOptions = {
	timeoutMs?: number;
};

type TimeoutHandle = {
	signal: AbortSignal;
	clear: () => void;
};

function createTimeoutHandle(timeoutMs?: number): TimeoutHandle | null {
	if (!timeoutMs) {
		return null;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort(new DOMException("Request timeout", "AbortError"));
	}, timeoutMs);

	return {
		signal: controller.signal,
		clear: () => clearTimeout(timeoutId),
	};
}

function isAbortError(error: unknown): error is DOMException {
	return error instanceof DOMException && error.name === "AbortError";
}

function formatTimeoutError(timeoutMs: number) {
	return `请求超时 (${timeoutMs}ms)，请检查模型服务或网络后重试`;
}

function formatNetworkError(error: Error) {
	if (
		error instanceof TypeError &&
		(error.message === "Failed to fetch" || error.message === "Load failed")
	) {
		return `无法连接本地 API 服务（${API_BASE_URL}）。请确认 API 服务已启动，或重新运行本地启动脚本后再测试模型连接。`;
	}

	return error.message;
}

export function apiUrl(path: string) {
	return `${API_BASE_URL}${path}`;
}

async function readApiEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) {
		return null;
	}

	try {
		return (await response.json()) as ApiEnvelope<T>;
	} catch {
		return null;
	}
}

function assertApiResponse<T>(
	response: Response,
	payload: ApiEnvelope<T> | null,
	fallbackMessage?: string,
): asserts payload is ApiEnvelope<T> {
	if (!response.ok || payload?.code !== 0) {
		throw new Error(
			payload?.message || fallbackMessage || `Request failed: ${response.status}`,
		);
	}
}

async function requestJson<T>(
	path: string,
	requestInit: RequestInit,
	options: ApiRequestOptions = {},
): Promise<T> {
	const timeoutHandle = createTimeoutHandle(options.timeoutMs);
	let response: Response;
	try {
		response = await fetch(apiUrl(path), {
			...requestInit,
			signal: timeoutHandle?.signal,
		});
	} catch (error) {
		timeoutHandle?.clear();
		if (isAbortError(error)) {
			throw new Error(formatTimeoutError(options.timeoutMs ?? 0));
		}
		throw error instanceof Error
			? new Error(formatNetworkError(error))
			: new Error(`Request failed: ${requestInit.method}`);
	}

	timeoutHandle?.clear();
	const payload = await readApiEnvelope<T>(response);
	assertApiResponse(response, payload, `Request failed: ${requestInit.method}`);

	return payload.data;
}

export async function postJson<T>(
	path: string,
	body: unknown,
	options: ApiRequestOptions = {},
): Promise<T> {
	return requestJson<T>(
		path,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		},
		options,
	);
}

export async function patchJson<T>(
	path: string,
	body: unknown,
	options: ApiRequestOptions = {},
): Promise<T> {
	return requestJson<T>(
		path,
		{
			method: "PATCH",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		},
		options,
	);
}

export async function postForm<T>(
	path: string,
	body: FormData,
	options: ApiRequestOptions = {},
): Promise<T> {
	const timeoutHandle = createTimeoutHandle(options.timeoutMs);
	let response: Response;

	try {
		response = await fetch(apiUrl(path), {
			method: "POST",
			body,
			signal: timeoutHandle?.signal,
		});
	} catch (error) {
		timeoutHandle?.clear();
		if (isAbortError(error)) {
			throw new Error(formatTimeoutError(options.timeoutMs ?? 0));
		}
		throw error instanceof Error
			? new Error(formatNetworkError(error))
			: new Error("Request failed");
	}

	timeoutHandle?.clear();
	const payload = await readApiEnvelope<T>(response);
	if (!response.ok || payload?.code !== 0) {
		if (response.status === 413) {
			throw new Error("上传文件超过 50MB 限制，请压缩后重试");
		}
		throw new Error(payload?.message || `Request failed: ${response.status}`);
	}

	return payload.data;
}

export async function getJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	return requestJson<T>(
		path,
		{
			method: "GET",
		},
		options,
	);
}

export async function deleteJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	return requestJson<T>(
		path,
		{
			method: "DELETE",
		},
		options,
	);
}
