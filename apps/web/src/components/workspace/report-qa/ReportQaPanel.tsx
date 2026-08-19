"use client";

import { useState } from "react";
import { HelpCircle, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestReportQa } from "@/lib/workspace-analysis-client";
import {
	REPORT_QA_REPORT_KIND_LABELS,
	REPORT_QA_SOURCE_KIND_LABELS,
	type ReportQaReportKind,
	type ReportQaResult,
} from "@ai-novel-diagnosis/ai-core";
import type { ProviderForm } from "@/stores/workspace-store";

const QUESTION_MIN = 10;
const QUESTION_MAX = 500;

/**
 * 报告问答面板（P2-T1）：诊断报告底部的锚定问答入口。
 * 会话级状态——问答是解释性交互，不是病历资产，结果只活在本次页面会话里，
 * 不进 store、不持久化、不改动报告本身。
 */
export function ReportQaPanel({
	provider,
	reportKind,
	report,
	sourceText,
}: {
	provider: ProviderForm;
	reportKind: ReportQaReportKind;
	report: string;
	sourceText?: string;
}) {
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [result, setResult] = useState<ReportQaResult | null>(null);
	const [isAsking, setIsAsking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const trimmed = question.trim();
	const canAsk = !isAsking && trimmed.length >= QUESTION_MIN && trimmed.length <= QUESTION_MAX;

	const ask = async () => {
		if (!canAsk) {
			return;
		}

		setIsAsking(true);
		setError(null);
		try {
			const answer = await requestReportQa({
				provider,
				question: trimmed,
				reportKind,
				report,
				sourceText,
			});
			setResult(answer);
		} catch (askError) {
			setResult(null);
			setError(
				askError instanceof Error
					? askError.message
					: "问答请求失败，请检查模型连接后重试。",
			);
		} finally {
			setIsAsking(false);
		}
	};

	return (
		<section className="rounded-md border border-border bg-card p-5">
			<button
				type="button"
				className="flex w-full cursor-pointer list-none items-center gap-2 text-left"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<MessageSquareText className="size-5 text-primary" />
				<div className="min-w-0">
					<h2 className="text-base font-semibold">
						对这份{REPORT_QA_REPORT_KIND_LABELS[reportKind]}有疑问？
					</h2>
					<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
						提问会得到带引用的解释；回答只依据报告与原文，答不了会直说。
					</p>
				</div>
				<span className="ml-auto shrink-0 text-xs text-muted-foreground">
					{open ? "收起" : "展开提问"}
				</span>
			</button>

			{open ? (
				<div className="mt-4 grid gap-3">
					<div className="flex flex-col gap-2 sm:flex-row">
						<textarea
							value={question}
							onChange={(event) => setQuestion(event.target.value)}
							placeholder="例如：为什么说我的冲突是一次性的？这句话依据报告里的哪条判定？"
							rows={2}
							maxLength={QUESTION_MAX + 100}
							className="min-h-[64px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
						/>
						<Button
							onClick={() => {
								void ask();
							}}
							disabled={!canAsk}
							className="h-fit shrink-0 font-semibold"
						>
							{isAsking ? (
								<Loader2 className="mr-1 size-4 animate-spin" />
							) : (
								<HelpCircle className="mr-1 size-4" />
							)}
							提问
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						{trimmed.length}/{QUESTION_MAX} 字（至少 {QUESTION_MIN}{" "}
						字）。回答不会被保存，刷新后消失。
					</p>

					{error ? (
						<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm leading-6 text-destructive">
							{error}
						</div>
					) : null}

					{result ? <ReportQaAnswerView result={result} /> : null}
				</div>
			) : null}
		</section>
	);
}

/** 问答结果的纯展示视图：回答 + 锚定引用 + 诚实的缺口披露。 */
export function ReportQaAnswerView({ result }: { result: ReportQaResult }) {
	return (
		<article className="grid gap-3 rounded-md border border-border bg-background p-4">
			<header className="flex flex-wrap items-center gap-2">
				<ShieldCheck className="size-4 text-primary" />
				<h3 className="m-0 text-sm font-semibold">解答</h3>
				{result.mode === "mock" ? (
					<span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
						演示回答：切换真实模型后才有可用的解释。
					</span>
				) : null}
			</header>

			<p className="m-0 text-sm leading-7">{result.answer}</p>

			{result.citations.length ? (
				<div className="grid gap-2">
					<p className="m-0 text-xs font-semibold text-muted-foreground">
						依据（{result.citations.length} 条引用）
					</p>
					{result.citations.map((citation, index) => (
						<blockquote
							key={`${index}-${citation.source}`}
							className="m-0 rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-6"
						>
							<b className="mb-0.5 block text-xs text-muted-foreground">
								{REPORT_QA_SOURCE_KIND_LABELS[citation.source]}
								{citation.locator ? `｜${citation.locator}` : ""}
							</b>
							{citation.quote}
							{citation.note ? (
								<span className="mt-1 block text-[11px] text-muted-foreground">
									{citation.note}
								</span>
							) : null}
						</blockquote>
					))}
				</div>
			) : null}

			{result.gaps.length ? (
				<div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
					<p className="m-0 text-xs font-semibold text-muted-foreground">
						未能回答的部分
					</p>
					<ul className="mb-0 mt-1 list-disc pl-5 text-xs leading-6 text-muted-foreground">
						{result.gaps.map((gap, index) => (
							<li key={index}>{gap}</li>
						))}
					</ul>
				</div>
			) : null}
		</article>
	);
}
