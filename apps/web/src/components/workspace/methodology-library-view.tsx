"use client";

import { Clipboard, Download, Layers3, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectMethodologyCard } from "@/stores/workspace-store";

const methodologyTypeLabels: Record<string, string> = {
	opening_rule: "开头规则",
	prompt_rule: "Prompt 规则",
	pacing_rule: "节奏规则",
	hook_rule: "钩子规则",
	payoff_rule: "爽点兑现",
	anti_pattern: "反模式",
};

export function MethodologyLibraryView({
	methodologyCards,
	onOpenDiagnosis,
	onExportProject,
}: {
	methodologyCards: ProjectMethodologyCard[];
	onOpenDiagnosis: () => void;
	onExportProject?: () => void;
}) {
	const [query, setQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const sortedCards = useMemo(
		() =>
			[...methodologyCards].sort((a, b) => {
				if (b.occurrenceCount !== a.occurrenceCount) {
					return b.occurrenceCount - a.occurrenceCount;
				}
				return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
			}),
		[methodologyCards],
	);
	const typeOptions = Array.from(new Set(sortedCards.map((card) => card.type))).filter(Boolean);
	const visibleCards = sortedCards.filter((card) => {
		const matchType = typeFilter === "all" || card.type === typeFilter;
		const keyword = query.trim().toLowerCase();
		if (!keyword) return matchType;
		const haystack = [
			card.title,
			card.triggerProblem,
			card.reusableRule,
			card.selfCheckQuestion,
			card.promptTemplate,
			card.sourceChapterTitle,
			card.sourceIssueTitle,
		]
			.filter(Boolean)
			.join("\n")
			.toLowerCase();
		return matchType && haystack.includes(keyword);
	});
	const repeatedCount = methodologyCards.filter((card) => card.occurrenceCount > 1).length;
	const promptTemplateCount = methodologyCards.filter((card) => card.promptTemplate).length;
	const topType = buildTopTypeLabel(methodologyCards);

	if (!methodologyCards.length) {
		return (
			<section className="rounded-md border border-border bg-card p-5">
				<div className="flex items-start gap-3">
					<Layers3 className="mt-0.5 size-5 text-primary" />
					<div className="min-w-0">
						<h2 className="text-lg font-semibold">方法论库</h2>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							完成快速诊断后，系统会把可复用规则沉淀成方法论卡片。
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
				<SummaryCard
					label="方法论卡"
					value={`${methodologyCards.length}`}
					detail="本项目已沉淀"
				/>
				<SummaryCard
					label="重复出现"
					value={`${repeatedCount}`}
					detail="优先转成固定自查项"
				/>
				<SummaryCard label="高频类型" value={topType} detail="当前最常见问题族" />
				<SummaryCard
					label="Prompt 模板"
					value={`${promptTemplateCount}`}
					detail="可直接复制复用"
				/>
			</section>

			<section className="rounded-md border border-border bg-card p-5">
				<div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
					<label className="relative block">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="pl-9"
							placeholder="搜索问题、规则、自查问题或 Prompt"
						/>
					</label>
					<select
						value={typeFilter}
						onChange={(event) => setTypeFilter(event.target.value)}
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
						aria-label="方法论类型"
					>
						<option value="all">全部类型</option>
						{typeOptions.map((type) => (
							<option key={type} value={type}>
								{formatMethodologyType(type)}
							</option>
						))}
					</select>
					{onExportProject ? (
						<Button type="button" variant="outline" onClick={onExportProject}>
							<Download className="mr-2 size-4" />
							导出项目
						</Button>
					) : null}
				</div>
			</section>

			<section className="grid gap-4 xl:grid-cols-2">
				{visibleCards.length ? (
					visibleCards.map((card) => (
						<MethodologyCardPanel key={card.projectCardId} card={card} />
					))
				) : (
					<div className="rounded-md border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
						没有匹配的方法论卡。
					</div>
				)}
			</section>
		</div>
	);
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
	return (
		<div className="rounded-md border border-border bg-card p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-2 text-2xl font-semibold">{value}</p>
			<p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
		</div>
	);
}

function MethodologyCardPanel({ card }: { card: ProjectMethodologyCard }) {
	const promptTemplate = card.promptTemplate?.trim();

	return (
		<article className="rounded-md border border-border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
							{formatMethodologyType(card.type)}
						</span>
						<span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
							{card.occurrenceCount} 次
						</span>
					</div>
					<h2 className="mt-3 text-base font-semibold">{card.title}</h2>
				</div>
				<p className="shrink-0 text-xs leading-5 text-muted-foreground">
					{formatDate(card.lastSeenAt)}
				</p>
			</div>
			<div className="mt-4 space-y-3 text-sm leading-6">
				<p>
					<span className="font-medium">触发问题：</span>
					{card.triggerProblem}
				</p>
				<p>
					<span className="font-medium">复用规则：</span>
					{card.reusableRule}
				</p>
				<p>
					<span className="font-medium">自查问题：</span>
					{card.selfCheckQuestion}
				</p>
				<p className="text-xs leading-5 text-muted-foreground">
					来源：{card.sourceChapterTitle}
					{card.sourceIssueTitle ? ` · ${card.sourceIssueTitle}` : ""}
				</p>
			</div>
			{promptTemplate ? (
				<div className="mt-4 rounded-md border border-border bg-background p-3">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-medium">Prompt 模板</p>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => {
								void navigator.clipboard?.writeText(promptTemplate);
							}}
						>
							<Clipboard className="mr-2 size-4" />
							复制
						</Button>
					</div>
					<textarea
						readOnly
						className="mt-3 min-h-28 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-xs leading-5 text-muted-foreground outline-none"
						value={promptTemplate}
					/>
				</div>
			) : null}
		</article>
	);
}

function buildTopTypeLabel(cards: ProjectMethodologyCard[]) {
	const counts = cards.reduce<Record<string, number>>((result, card) => {
		result[card.type] = (result[card.type] || 0) + 1;
		return result;
	}, {});
	const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
	return topType ? formatMethodologyType(topType) : "暂无";
}

function formatMethodologyType(type: string) {
	return methodologyTypeLabels[type] || "方法论";
}

function formatDate(value: string) {
	const time = new Date(value);
	if (Number.isNaN(time.getTime())) {
		return "时间未知";
	}

	return time.toLocaleDateString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
	});
}
