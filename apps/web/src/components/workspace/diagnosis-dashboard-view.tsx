"use client";

import { BarChart3, ClipboardCheck, Layers3, TrendingUp } from "lucide-react";
import { buildDiagnosisDashboard } from "@/lib/workspace-iteration";
import type { ProjectMethodologyCard, RevisionSession } from "@/stores/workspace-store";
import { Button } from "@/components/ui/button";

export function DiagnosisDashboardView({
	revisionSessions,
	methodologyCards,
	onOpenDiagnosis,
}: {
	revisionSessions: RevisionSession[];
	methodologyCards: ProjectMethodologyCard[];
	onOpenDiagnosis: () => void;
}) {
	const dashboard = buildDiagnosisDashboard({ sessions: revisionSessions, methodologyCards });
	const latestGate = dashboard.latest?.gateDecision || "revise";
	const scoreDeltaLabel =
		dashboard.scoreDelta === null
			? "暂无对比"
			: dashboard.scoreDelta >= 0
				? `+${dashboard.scoreDelta}`
				: String(dashboard.scoreDelta);

	if (!dashboard.totalSessions) {
		return (
			<section className="rounded-md border border-border bg-card p-5">
				<div className="flex items-start gap-3">
					<BarChart3 className="mt-0.5 size-5 text-primary" />
					<div className="min-w-0">
						<h2 className="text-lg font-semibold">诊断 Dashboard</h2>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							先完成一次快速诊断，系统会开始记录复诊趋势、Prompt 效果和常见问题。
						</p>
						<Button className="mt-4" onClick={onOpenDiagnosis}>
							开始诊断
						</Button>
					</div>
				</div>
			</section>
		);
	}

	return (
		<div className="space-y-5">
			<section className="grid gap-4 md:grid-cols-4">
				<MetricCard
					icon={ClipboardCheck}
					label="复诊次数"
					value={`${dashboard.totalSessions}`}
					detail={dashboard.latest?.chapterTitle || "暂无章节名"}
				/>
				<MetricCard
					icon={TrendingUp}
					label="最近分数变化"
					value={scoreDeltaLabel}
					detail={
						dashboard.latest
							? `${dashboard.latest.quickScore}/10 · ${formatGateLabel(latestGate)}`
							: "暂无诊断"
					}
				/>
				<MetricCard
					icon={BarChart3}
					label="Prompt 有效率"
					value={
						dashboard.promptEffectiveness.rate === null
							? "待观察"
							: `${dashboard.promptEffectiveness.rate}%`
					}
					detail={`${dashboard.promptEffectiveness.improved}/${dashboard.promptEffectiveness.comparable} 次复诊改善`}
				/>
				<MetricCard
					icon={Layers3}
					label="方法论卡"
					value={`${dashboard.totalMethodologyCards}`}
					detail={
						dashboard.reusableMethodologyCards[0]?.title || "继续复诊后会自动沉淀"
					}
				/>
			</section>

			<section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
				<div className="rounded-md border border-border bg-card p-5">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-lg font-semibold">质量趋势</h2>
							<p className="mt-1 text-sm leading-6 text-muted-foreground">
								按最近 8 次复诊展示；分数只用于趋势，最终决策仍看 Gate 和问题证据。
							</p>
						</div>
						<Button variant="outline" onClick={onOpenDiagnosis}>
							继续复诊
						</Button>
					</div>
					<div className="mt-5 space-y-3">
						{dashboard.qualityTrend.map((item) => (
							<div key={item.id} className="grid gap-2 sm:grid-cols-[72px_1fr_120px] sm:items-center">
								<p className="text-xs text-muted-foreground">{item.label}</p>
								<div className="h-3 overflow-hidden rounded-full bg-secondary">
									<div
										className="h-full rounded-full bg-primary"
										style={{ width: `${Math.max(3, Math.min(100, item.score * 10))}%` }}
									/>
								</div>
								<p className="text-sm font-medium">
									{item.score}/10 · {formatGateLabel(item.gateDecision)}
								</p>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-md border border-border bg-card p-5">
					<h2 className="text-lg font-semibold">Prompt 有效率推断</h2>
					<p className="mt-1 text-sm leading-6 text-muted-foreground">
						只统计上一轮存在改稿 Prompt 的相邻复诊；这是改稿相关性观察，不是因果证明。
					</p>
					<div className="mt-4 grid gap-3 sm:grid-cols-3">
						<SmallStat label="改善" value={dashboard.promptEffectiveness.improved} />
						<SmallStat label="持平" value={dashboard.promptEffectiveness.unchanged} />
						<SmallStat label="变差" value={dashboard.promptEffectiveness.worsened} />
					</div>
				</div>
			</section>

			<section className="grid gap-5 xl:grid-cols-3">
				<DistributionPanel title="Gate 分布" rows={dashboard.gateDistribution} />
				<DistributionPanel title="常见问题" rows={dashboard.commonIssues} />
				<DistributionPanel title="问题类型" rows={dashboard.categoryDistribution} />
			</section>

			<section className="rounded-md border border-border bg-card p-5">
				<h2 className="text-lg font-semibold">高频方法论卡</h2>
				<div className="mt-4 grid gap-3 lg:grid-cols-2">
					{dashboard.reusableMethodologyCards.length ? (
						dashboard.reusableMethodologyCards.map((card) => (
							<div key={card.projectCardId} className="rounded-md border border-border bg-background p-4">
								<div className="flex items-start justify-between gap-3">
									<p className="text-sm font-semibold">{card.title}</p>
									<span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
										{card.occurrenceCount} 次
									</span>
								</div>
								<p className="mt-2 text-sm leading-6 text-muted-foreground">
									{card.reusableRule}
								</p>
								<p className="mt-2 text-xs leading-5 text-muted-foreground">
									自查：{card.selfCheckQuestion}
								</p>
							</div>
						))
					) : (
						<div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
							继续复诊后，系统会把可复用规则沉淀到这里。
						</div>
					)}
				</div>
			</section>
		</div>
	);
}

function MetricCard({
	icon: Icon,
	label,
	value,
	detail,
}: {
	icon: typeof ClipboardCheck;
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Icon className="size-4 text-primary" />
				{label}
			</div>
			<p className="mt-3 text-2xl font-semibold">{value}</p>
			<p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{detail}</p>
		</div>
	);
}

function SmallStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md border border-border bg-background p-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-2 text-xl font-semibold">{value}</p>
		</div>
	);
}

function DistributionPanel({
	title,
	rows,
}: {
	title: string;
	rows: Array<{ id: string; label: string; count: number; percent: number }>;
}) {
	return (
		<div className="rounded-md border border-border bg-card p-5">
			<h2 className="text-lg font-semibold">{title}</h2>
			<div className="mt-4 space-y-3">
				{rows.length ? (
					rows.map((row) => (
						<div key={row.id}>
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="line-clamp-1">{row.label}</span>
								<span className="text-muted-foreground">{row.count}</span>
							</div>
							<div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
								<div
									className="h-full rounded-full bg-primary"
									style={{ width: `${Math.max(3, row.percent)}%` }}
								/>
							</div>
						</div>
					))
				) : (
					<p className="text-sm leading-6 text-muted-foreground">暂无足够数据。</p>
				)}
			</div>
		</div>
	);
}

function formatGateLabel(gate: string | undefined) {
	const map: Record<string, string> = {
		continue: "继续",
		revise: "修改",
		rebuild: "重构",
		discard: "废稿",
	};
	return map[gate || ""] || "修改";
}
