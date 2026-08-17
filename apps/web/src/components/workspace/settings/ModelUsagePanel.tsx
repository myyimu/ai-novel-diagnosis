"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ModelUsageEvent, ModelUsageSummary } from "@/api/model-usage";
import { cn } from "@/lib/utils";

interface ModelUsagePanelProps {
	summary: ModelUsageSummary | null;
	events: ModelUsageEvent[];
	loading: boolean;
	error: string | null;
	onRefresh: () => void;
}

function formatTokens(value: number) {
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1)}M`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(1)}k`;
	}
	return String(value);
}

function formatRequestMs(value: number | null) {
	if (value === null) {
		return "—";
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(1)}s`;
	}
	return `${value}ms`;
}

function formatEventTime(iso: string) {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("zh-CN", { hour12: false });
}

function describeStage(event: ModelUsageEvent) {
	const parts = [event.stage, event.requestKind].filter(Boolean);
	const attempt =
		typeof event.metadata?.attempt === "string" && event.metadata.attempt !== "initial"
			? `（${event.metadata.attempt}）`
			: "";
	return parts.length ? `${parts.join(" · ")}${attempt}` : "未标注阶段";
}

export function ModelUsagePanel({
	summary,
	events,
	loading,
	error,
	onRefresh,
}: ModelUsagePanelProps) {
	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>模型用量</CardTitle>
				<CardDescription>
					最近通过当前 API 服务发起的模型调用统计；estimated 表示服务未返回 token
					数、按启发式估算的请求。
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex items-center justify-between gap-3">
					<div className="flex flex-wrap gap-2 text-xs">
						{summary ? (
							<>
								<UsageBadge label="总请求" value={String(summary.totalRequests)} />
								<UsageBadge
									label="失败"
									value={String(summary.failedRequests)}
									tone={summary.failedRequests > 0 ? "danger" : "muted"}
								/>
								<UsageBadge
									label="总 token"
									value={formatTokens(summary.totalTokens)}
								/>
								<UsageBadge
									label="估算请求"
									value={String(summary.estimatedRequests)}
								/>
								<UsageBadge
									label="平均耗时"
									value={formatRequestMs(summary.avgRequestMs)}
								/>
							</>
						) : (
							<span className="text-[#69707d]">
								{loading ? "正在加载用量数据…" : "暂无用量数据。"}
							</span>
						)}
					</div>
					<Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
						{loading ? "刷新中…" : "刷新"}
					</Button>
				</div>

				{error ? (
					<p className="mb-3 rounded-[10px] border border-[#ffd0c2] bg-[#fff0eb] px-3 py-2 text-xs text-[#b42318]">
						{error}
					</p>
				) : null}

				{summary && summary.byModel.length > 0 ? (
					<div className="mb-4 flex flex-wrap gap-2">
						{summary.byModel.map((item) => (
							<span
								key={item.model}
								className="rounded-full border border-[#e6e8eb] bg-[#f7f8fa] px-3 py-1 text-xs text-[#4e5562]"
							>
								{item.model} · {item.requests} 次 · {formatTokens(item.totalTokens)}{" "}
								token
							</span>
						))}
					</div>
				) : null}

				{events.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[720px] border-collapse text-xs">
							<thead>
								<tr className="border-b border-[#e6e8eb] text-left text-[#69707d]">
									<th className="py-2 pr-3 font-medium">时间</th>
									<th className="py-2 pr-3 font-medium">模型</th>
									<th className="py-2 pr-3 font-medium">阶段</th>
									<th className="py-2 pr-3 text-right font-medium">token</th>
									<th className="py-2 pr-3 text-right font-medium">耗时</th>
									<th className="py-2 font-medium">状态</th>
								</tr>
							</thead>
							<tbody>
								{events.map((event) => (
									<tr key={event.id} className="border-b border-[#f0f1f3]">
										<td className="py-2 pr-3 whitespace-nowrap text-[#4e5562]">
											{formatEventTime(event.createdAt)}
										</td>
										<td className="py-2 pr-3">
											<span className="font-medium">{event.model}</span>
											{event.estimated ? (
												<span className="ml-1 text-[#8c5009]">
													（估算）
												</span>
											) : null}
										</td>
										<td className="py-2 pr-3 text-[#4e5562]">
											{describeStage(event)}
										</td>
										<td className="py-2 pr-3 text-right">
											{formatTokens(event.totalTokens)}
										</td>
										<td className="py-2 pr-3 text-right">
											{formatRequestMs(event.requestMs)}
										</td>
										<td className="py-2">
											{event.success ? (
												<span className="text-[#176e50]">成功</span>
											) : (
												<span
													className="text-[#b42318]"
													title={event.error ?? undefined}
												>
													失败
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-xs text-[#69707d]">
						还没有模型调用记录；完成一次诊断后点击刷新即可看到。
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function UsageBadge({
	label,
	value,
	tone = "default",
}: {
	label: string;
	value: string;
	tone?: "default" | "muted" | "danger";
}) {
	return (
		<span
			className={cn(
				"rounded-full border px-3 py-1",
				tone === "danger" && "border-[#ffd0c2] bg-[#fff0eb] text-[#b42318]",
				tone === "muted" && "border-[#e6e8eb] bg-[#f7f8fa] text-[#69707d]",
				tone === "default" && "border-[#cfe8dc] bg-[#eaf8f1] text-[#176e50]",
			)}
		>
			{label}：<b>{value}</b>
		</span>
	);
}
