"use client";

import { useEffect, useRef, useState } from "react";

import {
	PREMISE_CONSULT_LOW_EVIDENCE_THRESHOLD,
	PREMISE_LAYER_META,
	PREMISE_VERDICT_LABELS,
	PREMISE_VERDICT_RELATION_LABELS,
	suggestPremiseConsult,
	type PremiseConsultResult,
	type PremiseConsultTrigger,
	type PremiseReviewResult,
} from "@ai-novel-diagnosis/ai-core";
import { Button } from "@/components/ui/button";
import { requestPremiseConsult } from "@/lib/workspace-analysis-client";
import type { ProviderForm } from "@/stores/workspace-store";
import { Gavel, Loader2, Scale, TriangleAlert } from "lucide-react";

const LAYER_STATUS_LABELS: Record<string, string> = {
	established: "成立",
	weak: "待修补",
	missing: "缺失",
};

const VERDICT_CHIP_CLASSES: Record<string, string> = {
	solid: "bg-[#f0faf3] text-[#1d7a3e]",
	fixable: "bg-[#fff7e6] text-[#8a5a0b]",
	"not-worth-writing": "bg-[#fff0f0] text-[#a82f2d]",
};

const RELATION_BANNERS: Record<string, string> = {
	agree: "border-[#bfe3c8] bg-[#f0faf3] text-[#1d7a3e]",
	adjacent: "border-[#f5d9a8] bg-[#fff7e6] text-[#8a5a0c]",
	opposite: "border-[#f0c3c2] bg-[#fff0f0] text-[#a82f2d]",
};

/**
 * 立项会诊面板（T4-①）：召唤一位立场上与第一审稿人相反的第二审稿人
 * 盲审同一份灵感。四条红线在 UI 侧的落点——第二审稿人只判断不代写、
 * 一致/分歧由程序比对（本面板不做任何裁决）、分歧双栏并列呈现且
 * 原判定永不被覆盖、第二审稿人的证据逐条锚定原文（未锚定的被服务端
 * 丢弃并如实计数）。
 *
 * 触发措辞遵循 doctrine：confidence 是证据完整度提示，不是正确概率。
 */
export function PremiseConsultPanel({
	provider,
	projectId,
	premiseText,
	genre,
	review,
}: {
	provider: ProviderForm;
	/** 带项目号时真实模型会诊会记入项目病历。 */
	projectId?: string;
	premiseText: string;
	genre?: string;
	review: PremiseReviewResult;
}) {
	const [consult, setConsult] = useState<PremiseConsultResult | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/* 新一轮审稿意味着旧会诊比对的对象已过时——整体重置。 */
	const reviewIdRef = useRef(review.reviewId);
	useEffect(() => {
		if (reviewIdRef.current !== review.reviewId) {
			reviewIdRef.current = review.reviewId;
			setConsult(null);
			setError(null);
		}
	}, [review.reviewId]);

	const request = (trigger: PremiseConsultTrigger) => {
		setBusy(true);
		setError(null);
		requestPremiseConsult({
			provider,
			projectId,
			premiseText,
			genre,
			trigger,
			original: {
				verdict: review.engineVerdict,
				oneLineVerdict: review.oneLineVerdict,
				layers: review.layers,
			},
		})
			.then((result) => {
				setConsult(result);
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

	const lowEvidence = suggestPremiseConsult(review.layers);
	const thinnest = review.layers.reduce(
		(min, layer) => (layer.confidence < min.confidence ? layer : min),
		review.layers[0] ?? { confidence: 1, layer: "engine" as const },
	);

	return (
		<section className="mt-[22px] overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<header className="border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-[18px] pb-3.5">
				<h2 className="m-0 flex items-center gap-2 text-base font-bold leading-snug">
					<Scale className="size-[18px] text-[#ff5a1f]" />
					第二审稿人会诊
				</h2>
				<p className="mt-1 text-xs text-[#69707d]">
					第二审稿人立场相反：负责为这个灵感构建最强的成立论证，但四层审计不放水。
					盲审——看不到第一份结论；一致与分歧由程序比对，结论并列展示、不覆盖原判定。
				</p>
			</header>

			<div className="p-5">
				{error ? (
					<div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#f0c3c2] bg-[#fff0f0] px-3.5 py-2.5 text-xs leading-5 text-[#a82f2d]">
						<TriangleAlert className="mt-0.5 size-4 shrink-0" />
						{error}
					</div>
				) : null}

				{!consult ? (
					<div className="grid gap-3">
						{lowEvidence ? (
							<div className="rounded-[10px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-2.5 text-xs leading-5 text-[#7f4a0c]">
								提示：「{PREMISE_LAYER_META[thinnest.layer].label}
								」这一层的证据完整度只有 {thinnest.confidence.toFixed(2)}（≤{" "}
								{PREMISE_CONSULT_LOW_EVIDENCE_THRESHOLD}）。 confidence
								指证据完整度，不是正确率——可以请第二审稿人再看一次。
							</div>
						) : null}
						<div className="flex flex-wrap items-center gap-2.5">
							<Button
								onClick={() => request("author-disagrees")}
								disabled={busy}
								className="min-h-10 rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
							>
								{busy ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Gavel className="mr-2 size-4" />
								)}
								我不服这个结论，申请会诊
							</Button>
							<Button
								onClick={() => request("low-evidence")}
								disabled={busy}
								variant="outline"
								className="min-h-10 rounded-[9px] border-[#d8dbe0] font-bold text-[#3c414b] hover:bg-[#f7f8f9]"
							>
								证据不足，请第二审稿人
							</Button>
						</div>
						<p className="m-0 text-[11px] leading-5 text-[#9aa1ac]">
							会诊只呈现两方各自的论证与锚定证据，不会替你裁决写不写。
						</p>
					</div>
				) : (
					<ConsultResultView result={consult} />
				)}
			</div>
		</section>
	);
}

/** 会诊结果的双栏呈现：两方结论、层比对表、第二审稿人的论证与锚定证据。 */
export function ConsultResultView({ result }: { result: PremiseConsultResult }) {
	const { original, second, comparison } = result;

	return (
		<div className="grid gap-4">
			<div
				className={`flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-xs font-bold leading-5 ${RELATION_BANNERS[comparison.verdictRelation]}`}
			>
				<Scale className="mt-0.5 size-4 shrink-0" />
				{PREMISE_VERDICT_RELATION_LABELS[comparison.verdictRelation]}
				（由程序比对，非模型叙述）
			</div>

			{result.mode === "mock" ? (
				<div className="rounded-[10px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-2.5 text-xs leading-5 text-[#7f4a0c]">
					当前是演示模式：第二审稿人的结构为占位数据，不代表真实编辑判断。
				</div>
			) : null}

			<div className="grid gap-3.5 md:grid-cols-2">
				<ConsultSideView
					title="第一审稿人（先找理由拒绝）"
					verdict={original.verdict}
					oneLineVerdict={original.oneLineVerdict}
				/>
				<ConsultSideView
					title="第二审稿人（最强成立论证）"
					verdict={second.verdict}
					oneLineVerdict={second.oneLineVerdict}
					strongestArgument={second.strongestArgument}
					evidence={second.evidence}
				/>
			</div>

			<section className="overflow-hidden rounded-[12px] border border-[#e6e8eb]">
				<header className="border-b border-[#e6e8eb] bg-[#fcfcfd] px-4 py-2.5 text-xs font-bold text-[#3c414b]">
					四层审计对照（盲审后的程序比对）
				</header>
				<table className="m-0 w-full border-collapse text-left text-xs">
					<thead>
						<tr className="bg-[#fcfcfd] text-[11px] text-[#69707d]">
							<th className="px-4 py-2 font-bold">审计层</th>
							<th className="px-4 py-2 font-bold">第一审</th>
							<th className="px-4 py-2 font-bold">第二审</th>
							<th className="px-4 py-2 font-bold">比对</th>
						</tr>
					</thead>
					<tbody>
						{comparison.layerComparisons.map((item) => (
							<tr key={item.layer} className="border-t border-[#eef0f2]">
								<td className="px-4 py-2.5 font-bold text-[#3c414b]">
									{PREMISE_LAYER_META[item.layer].label}
								</td>
								<td className="px-4 py-2.5 text-[#69707d]">
									{LAYER_STATUS_LABELS[item.originalStatus] ??
										item.originalStatus}
								</td>
								<td className="px-4 py-2.5 text-[#69707d]">
									{LAYER_STATUS_LABELS[item.secondStatus] ?? item.secondStatus}
								</td>
								<td className="px-4 py-2.5">
									{item.agrees ? (
										<span className="text-[#1d7a3e]">一致</span>
									) : (
										<span className="font-bold text-[#a82f2d]">分歧</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>

			{comparison.droppedEvidenceCount > 0 ? (
				<p className="m-0 text-[11px] leading-5 text-[#955208]">
					另有 {comparison.droppedEvidenceCount}{" "}
					条第二审稿人的引文未能在你的原文中定位，已被服务端丢弃（不算数）。
				</p>
			) : null}

			{result.recordId ? (
				<p className="m-0 text-[11px] leading-5 text-[#1d7a3e]">
					本次会诊已记入项目病历（导出项目包时会随两方判定一并导出）。
				</p>
			) : null}

			<p className="m-0 text-[11px] leading-5 text-[#9aa1ac]">
				会诊结果与原判定并列展示，不覆盖、不修改；写不写由你裁决。
			</p>
		</div>
	);
}

function ConsultSideView({
	title,
	verdict,
	oneLineVerdict,
	strongestArgument,
	evidence,
}: {
	title: string;
	verdict: PremiseReviewResult["engineVerdict"];
	oneLineVerdict: string;
	strongestArgument?: string;
	evidence?: Array<{ quote: string; note?: string }>;
}) {
	return (
		<div className="rounded-[12px] border border-[#e6e8eb] p-4">
			<div className="flex items-center justify-between gap-2">
				<h3 className="m-0 text-xs font-bold text-[#3c414b]">{title}</h3>
				<span
					className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${VERDICT_CHIP_CLASSES[verdict]}`}
				>
					{PREMISE_VERDICT_LABELS[verdict]}
				</span>
			</div>
			<p className="mt-2.5 text-xs leading-6 text-[#3c414b]">{oneLineVerdict}</p>
			{strongestArgument ? (
				<div className="mt-3 rounded-[10px] bg-[#f7f8f9] px-3.5 py-2.5 text-xs leading-6 text-[#3c414b]">
					<strong className="font-bold">最强成立论证：</strong>
					{strongestArgument}
				</div>
			) : null}
			{evidence && evidence.length > 0 ? (
				<ul className="m-0 mt-3 grid list-none gap-2 p-0">
					{evidence.map((item, index) => (
						<li
							key={`${index}-${item.quote.slice(0, 12)}`}
							className="rounded-[10px] border-l-2 border-[#ff8b5f] bg-[#fff8f4] px-3 py-2"
						>
							<blockquote className="m-0 text-xs leading-6 text-[#3c414b]">
								「{item.quote}」
							</blockquote>
							{item.note ? (
								<span className="mt-1 block text-[11px] leading-5 text-[#9aa1ac]">
									{item.note}
								</span>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
