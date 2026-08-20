/**
 * 代理超时分级：按路径决定转发上游的超时上限。
 * 独立成模块是为了可测——premise-review 曾因白名单漏配被 30s 默认超时掐死
 * （真实模型审稿 >30s 必挂 504），这类回归必须用测试钉死。
 */

export const PROVIDER_TEST_TIMEOUT_MS = 20_000;
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000;
export const MODEL_UPSTREAM_TIMEOUT_MS = readPositiveIntegerEnv(
	process.env.API_MODEL_PROXY_TIMEOUT_MS,
	600_000,
);

export function readPositiveIntegerEnv(value: string | undefined, fallback: number) {
	if (!value) {
		return fallback;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isProviderTestPath(path: string[]) {
	return (
		path.length >= 3 && path[0] === "analysis" && path[1] === "provider" && path[2] === "test"
	);
}

/**
 * 反转默认：/analysis/* 下除 provider 外一律按模型级超时。
 * 原白名单（quick-review/book/…清单）每加一个模型端点都要记得改这里，
 * premise-consult、report-divergence 等 P2 端点就是漏改的代价——超时上限
 * 对快调用没有影响（它们毫秒级返回），宁可全给长超时也不再维护清单。
 */
export function isModelBackedAnalysisPath(path: string[]) {
	return path[0] === "analysis" && path[1] !== "provider";
}

export function resolveProxyTimeoutMs(path: string[]) {
	if (isProviderTestPath(path)) {
		return PROVIDER_TEST_TIMEOUT_MS;
	}

	if (isModelBackedAnalysisPath(path)) {
		return MODEL_UPSTREAM_TIMEOUT_MS;
	}

	return DEFAULT_UPSTREAM_TIMEOUT_MS;
}

export function resolveProxyTimeoutMessage(path: string[]) {
	if (isProviderTestPath(path)) {
		return "Provider test timed out, please check API service reachability or retry later";
	}

	if (isModelBackedAnalysisPath(path)) {
		return "当前模型可能在排队，可稍后重试或切换。";
	}

	return "Request timed out, please retry later";
}

export function resolveProxyUnavailableMessage(path: string[]) {
	if (isProviderTestPath(path)) {
		return "Provider test proxy failed. Check network or server status";
	}

	return "本地 API 服务暂时不可用，可能正在启动或重启。请稍候重试。";
}
