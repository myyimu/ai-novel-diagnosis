import { getJson } from "@/lib/api-client";

/** One persisted provider chat attempt (see api model_usage_events). */
export interface ModelUsageEvent {
	id: string;
	jobId: string | null;
	stage: string | null;
	component: string | null;
	requestKind: string | null;
	provider: string;
	preset: string;
	model: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	requestMs: number;
	estimated: boolean;
	success: boolean;
	error: string | null;
	metadata: Record<string, unknown>;
	createdAt: string;
}

export interface ModelUsageSummary {
	since: string | null;
	totalRequests: number;
	successRequests: number;
	failedRequests: number;
	estimatedRequests: number;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	avgRequestMs: number | null;
	byModel: Array<{
		model: string;
		requests: number;
		totalTokens: number;
	}>;
}

export function getModelUsageEvents(
	options: { jobId?: string; limit?: number } = {},
): Promise<ModelUsageEvent[]> {
	const params = new URLSearchParams();
	if (options.jobId) {
		params.set("jobId", options.jobId);
	}
	if (options.limit !== undefined) {
		params.set("limit", String(options.limit));
	}
	const query = params.toString();
	return getJson<ModelUsageEvent[]>(`/analysis/model-usage/events${query ? `?${query}` : ""}`);
}

export function getModelUsageSummary(since?: string): Promise<ModelUsageSummary> {
	const query = since ? `?since=${encodeURIComponent(since)}` : "";
	return getJson<ModelUsageSummary>(`/analysis/model-usage/summary${query}`);
}
