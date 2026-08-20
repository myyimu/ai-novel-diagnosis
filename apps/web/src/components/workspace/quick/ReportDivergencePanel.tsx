"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
	QuickReviewResult,
	ReportDivergencePoint,
	ReportDivergenceResult,
} from "@ai-novel-diagnosis/ai-core";
import { Button } from "@/components/ui/button";
import { buildQuickReviewQaReport, buildStoryAuditQaReport } from "@/lib/report-qa-text";
import { requestReportDivergence } from "@/lib/workspace-analysis-client";
import type { ProviderForm, StoryAuditResult } from "@/stores/workspace-store";
import { GitCompareArrows, Loader2, TriangleAlert } from "lucide-react";

/**
 * 报告会诊面板（T4-②）：同一章的快诊报告 × 整书体检报告矛盾检测。
 * 四条红线在 UI 侧的落点——检测只呈现矛盾不代写改法（每条分歧以问句
 * 收尾交回作者）、两份报告并列引用且都保留原样（不互相覆盖）、
 * 未锚定的分歧点被服务端丢弃并如实计数、矛盾不静默：检测到几条就
 * 摆几条，一条都没有时也如实说明"未发现直接矛盾"。
 */
export function ReportDivergencePanel({
	provider,
	quickReviewResult,
	storyAudit,
}: {
	provider: ProviderForm;
	quickReviewResult: QuickReviewResult;
	storyAudit: StoryAuditResult;
}) {
	const [result, setResult] = useState<ReportDivergenceResult | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const quickReviewReport = useMemo(
		() => buildQuickReviewQaReport(quickReviewResult),
		[quickReviewResult],
	);
	const storyAuditReport = useMemo(() => buildStoryAuditQaReport(storyAudit), [storyAudit]);

	/* 新一轮快诊意味着旧分歧比对的对象已过时——整体重置。 */
	const fingerprintRef = useRef(`${quickReviewResult.title}|${quickReviewResult.quickScore}`);
	useEffect(() => {
		const fingerprint = `${quickReviewResult.title}|${quickReviewResult.quickScore}`;
		if (fingerprintRef.current !== fingerprint) {
			fingerprintRef.current = fingerprint;
			setResult(null);
			setError(null);
		}
	}, [quickReviewResult.title, quickReviewResult.quickScore]);

	const detect = () => {
		setBusy(true);
		setError(null);
		requestReportDivergence({
			provider,
			chapterTitle: quickReviewResult.title,
			quickReviewReport,
			storyAuditReport,
		})
			.then((next) => {
				setResult(next);
			})
			.catch((requestError: unknown) => {
				setError(
					requestError instanceof Error
						? requestError.message
						: "会诊请求失败，请稍后重试。",
				);
			})
			.finally(() => {
				setBusy(false);
			});
	};

	return (
		<section className="mt-[22px] overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<header className="border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-[18px] pb-3.5">
				<h2 className="m-0 flex items-center gap-2 text-base font-bold leading-snug">
					<GitCompareArrows className="size-[18px] text-[#ff5a1f]" />
					报告会诊：快诊 × 体检
				</h2>
				<p className="mt-1 text-xs text-[#69707d]">
					这一章你既有快诊报告，项目里也有整书体检报告。这里检测两份报告对同一章的
					矛盾结论：每条分歧都会同时引用两份报告的原话；两份报告都保留原样，矛盾交回给你裁决。
				</p>
			</header>

			<div className="p-5">
				{error ? (
					<div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#f0c3c2] bg-[#fff0f0] px-3.5 py-2.5 text-xs leading-5 text-[#a82f2d]">
						<TriangleAlert className="mt-0.5 size-4 shrink-0" />
						{error}
					</div>
				) : null}

				{!result ? (
					<div className="flex flex-wrap items-center justify-between gap-3">
						<span className="text-[11px] leading-5 text-[#9aa1ac]">
							只有"一方肯定、一方否定"的直接矛盾才算分歧；某份报告没提到的不算。
						</span>
						<Button
							onClick={detect}
							disabled={busy}
							className="min-h-10 rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
						>
							{busy ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<GitCompareArrows className="mr-2 size-4" />
							)}
							检测矛盾结论
						</Button>
					</div>
				) : (
					<DivergenceResultView result={result} />
				)}
			</div>
		</section>
	);
}

/** 会诊结果呈现：每条矛盾双引并列 + 交给作者的问句；无矛盾时如实说明。 */
export function DivergenceResultView({ result }: { result: ReportDivergenceResult }) {
	return (
		<div className="grid gap-4">
			{result.mode === "mock" ? (
				<div className="rounded-[10px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-2.5 text-xs leading-5 text-[#7f4a0c]">
					当前是演示模式：这条"分歧"只验证引文锚定结构，不代表两份报告真实矛盾。
				</div>
			) : null}

			{result.divergences.length === 0 ? (
				<div className="rounded-[10px] border border-[#bfe3c8] bg-[#f0faf3] px-3.5 py-2.5 text-xs leading-5 text-[#1d7a3e]">
					{result.agreementNote || "两份报告对这一章没有发现直接矛盾。"}
				</div>
			) : (
				result.divergences.map((point) => (
					<DivergencePointView key={point.id} point={point} />
				))
			)}

			{result.droppedPointCount > 0 ? (
				<p className="m-0 text-[11px] leading-5 text-[#955208]">
					另有 {result.droppedPointCount}{" "}
					条分歧未能在两份报告中同时锚定引文，已被服务端丢弃（不算数）。
				</p>
			) : null}

			<p className="m-0 text-[11px] leading-5 text-[#9aa1ac]">
				两份报告都保留原样；信哪一份由你决定，矛盾不会被自动消解。
			</p>
		</div>
	);
}

function DivergencePointView({ point }: { point: ReportDivergencePoint }) {
	return (
		<article className="overflow-hidden rounded-[12px] border border-[#e6e8eb]">
			<header className="flex items-center gap-2 border-b border-[#e6e8eb] bg-[#fcfcfd] px-4 py-2.5">
				<span className="rounded-full bg-[#fff2ec] px-2.5 py-1 text-[11px] font-bold text-[#c94413]">
					矛盾 · {point.topic}
				</span>
			</header>
			<div className="grid gap-3 p-4">
				<div className="grid gap-2.5 md:grid-cols-2">
					<div className="rounded-[10px] bg-[#f7f8f9] px-3.5 py-2.5">
						<span className="text-[11px] font-bold text-[#59606b]">快诊报告说</span>
						<blockquote className="m-0 mt-1.5 text-xs leading-6 text-[#3c414b]">
							「{point.quickReviewQuote}」
						</blockquote>
					</div>
					<div className="rounded-[10px] bg-[#f7f8f9] px-3.5 py-2.5">
						<span className="text-[11px] font-bold text-[#59606b]">体检报告说</span>
						<blockquote className="m-0 mt-1.5 text-xs leading-6 text-[#3c414b]">
							「{point.storyAuditQuote}」
						</blockquote>
					</div>
				</div>
				<p className="m-0 text-xs leading-6 text-[#3c414b]">{point.explanation}</p>
				<div className="rounded-[10px] border border-[#ffd6c2] bg-[#fff8f4] px-3.5 py-2.5 text-xs leading-6 text-[#7a381c]">
					<strong className="font-bold">交给你裁决：</strong>
					{point.questionForAuthor}
				</div>
			</div>
		</article>
	);
}
