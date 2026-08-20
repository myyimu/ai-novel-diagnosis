"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import {
	PREMISE_ENGINE_CARD_STATUS_LABELS,
	PREMISE_FINDING_REVIEW_STATE_LABELS,
	PREMISE_LAYER_META,
	PREMISE_REVIEW_LAYERS,
	PREMISE_UPGRADE_ORIENTATION_LABELS,
	type PremiseEngineCard,
	type PremiseFindingReview,
	type PremiseFindingReviewState,
	type PremiseReviewResult,
	type PremiseReviewVerdict,
} from "@ai-novel-diagnosis/ai-core";
import { ReportQaPanel } from "@/components/workspace/report-qa/ReportQaPanel";
import { PremiseConsultPanel } from "@/components/workspace/premise/PremiseConsultPanel";
import { PremiseDialoguePanel } from "@/components/workspace/premise/PremiseDialoguePanel";
import type { PremiseDialogueContractForm } from "@/lib/workspace-analysis-client";
import { buildPremiseReviewQaReport } from "@/lib/report-qa-text";
import type { ProviderForm } from "@/stores/workspace-store";
import { Clipboard, FileCheck2, Loader2, PenLine, ShieldCheck, TriangleAlert } from "lucide-react";

/** The editable engine-card draft: the six restated contract lines. */
export interface PremiseContractDraft {
	premiseSummary: string;
	coreConflict: string;
	protagonistDesire: string;
	opposingForce: string;
	irreducibilityTest: string;
	readerHookQuestion: string;
}

export type PremiseFindingDecision = Exclude<PremiseFindingReviewState, "unreviewed">;

export interface PremiseReviewComposeProps {
	providerLabel: string;
	isMockProvider: boolean;
	/** 报告问答（P2-T1）用当前供应商发起无状态提问。 */
	provider: ProviderForm;
	premiseText: string;
	onPremiseTextChange: (value: string) => void;
	genre: string;
	onGenreChange: (value: string) => void;
	isReviewing: boolean;
	elapsedSeconds: number;
	error: string | null;
	result: PremiseReviewResult | null;
	onRunReview: () => void;
	onWriteFirstChapter: () => void;
	/* —— 阶段①闭环：发动机卡与俗套判定（P1） —— */
	/** 引导对话（T3）按项目归档，作者亲笔契约可带回发动机卡。 */
	projectId: string;
	onAdoptDialogueContract: (contract: PremiseDialogueContractForm) => void;
	targetProjectName: string;
	contract: PremiseContractDraft | null;
	onContractChange: (field: keyof PremiseContractDraft, value: string) => void;
	engineCard: PremiseEngineCard | null;
	isSavingCard: boolean;
	cardError: string | null;
	onSaveCard: (status: "draft" | "confirmed") => void;
	findingReviews: PremiseFindingReview[];
	isSavingReview: boolean;
	onReviewFinding: (findingId: string, reviewState: PremiseFindingDecision) => void;
}

const genreOptions = [
	{ value: "", label: "暂不指定" },
	{ value: "xuanhuan", label: "玄幻" },
	{ value: "urban", label: "都市" },
	{ value: "romance", label: "言情" },
	{ value: "suspense", label: "悬疑" },
	{ value: "infinite-flow", label: "无限流" },
	{ value: "other", label: "其他" },
];

const verdictMeta: Record<
	PremiseReviewVerdict,
	{ label: string; bannerClass: string; chipClass: string }
> = {
	solid: {
		label: "值得写",
		bannerClass: "border-[#bfe3c8] bg-[#f0faf3] text-[#1f6b3a]",
		chipClass: "bg-[#e6f6ec] text-[#1f6b3a]",
	},
	fixable: {
		label: "值得写，但先修这几处",
		bannerClass: "border-[#f5d9a8] bg-[#fff7e6] text-[#7f4a0c]",
		chipClass: "bg-[#fff7e6] text-[#955208]",
	},
	"not-worth-writing": {
		label: "暂不值得写",
		bannerClass: "border-[#f0c3c2] bg-[#fff0f0] text-[#a82f2d]",
		chipClass: "bg-[#fff0f0] text-[#a82f2d]",
	},
};

const layerStatusMeta: Record<
	"established" | "weak" | "missing",
	{ label: string; chipClass: string }
> = {
	established: { label: "成立", chipClass: "bg-[#e6f6ec] text-[#1f6b3a]" },
	weak: { label: "待修补", chipClass: "bg-[#fff7e6] text-[#955208]" },
	missing: { label: "缺失", chipClass: "bg-[#eef0f3] text-[#69707d]" },
};

const findingStatusMeta: Record<"candidate" | "verified" | "needs_human" | "dismissed", string> = {
	verified: "bg-[#e6f6ec] text-[#1f6b3a]",
	candidate: "bg-[#eef0f3] text-[#59606b]",
	needs_human: "bg-[#fff7e6] text-[#955208]",
	dismissed: "bg-[#f4f5f6] text-[#9aa1ab] line-through",
};

const findingStatusLabels: Record<"candidate" | "verified" | "needs_human" | "dismissed", string> =
	{
		verified: "已复核",
		candidate: "待复核",
		needs_human: "需人工判断",
		dismissed: "已驳回",
	};

const severityLabels: Record<string, string> = {
	high: "高",
	medium: "中",
	low: "低",
};

/** 作者对俗套点的四个动作（搁置之外没有第五种编辑决定）。 */
const findingDecisionOptions: PremiseFindingDecision[] = [
	"confirmed",
	"author_intent",
	"false_positive",
	"deferred",
];

const contractFields: Array<{
	key: keyof PremiseContractDraft;
	label: string;
}> = [
	{ key: "coreConflict", label: "核心冲突" },
	{ key: "protagonistDesire", label: "主角欲望" },
	{ key: "opposingForce", label: "对立阻力" },
	{ key: "irreducibilityTest", label: "不可替代性测试" },
	{ key: "readerHookQuestion", label: "读者钩子问题" },
];

export function PremiseReviewCompose(props: PremiseReviewComposeProps) {
	const {
		providerLabel,
		isMockProvider,
		provider,
		premiseText,
		onPremiseTextChange,
		genre,
		onGenreChange,
		isReviewing,
		elapsedSeconds,
		error,
		result,
		onRunReview,
		onWriteFirstChapter,
		projectId,
		onAdoptDialogueContract,
		targetProjectName,
		contract,
		onContractChange,
		engineCard,
		isSavingCard,
		cardError,
		onSaveCard,
		findingReviews,
		isSavingReview,
		onReviewFinding,
	} = props;

	const charCount = premiseText.trim().length;
	const canRun = !isReviewing && charCount >= 20 && charCount <= 4000;
	const reviewByFindingId = useMemo(
		() => new Map(findingReviews.map((review) => [review.findingId, review])),
		[findingReviews],
	);

	return (
		<RedesignWorkspaceShell
			active="quick"
			providerLabel={providerLabel}
			crumb={
				<>
					诊断工作区 / <b className="text-[#1f2329]">立项审稿</b>
				</>
			}
			topActions={
				<RedesignTopButton onClick={onWriteFirstChapter}>直接去写第一章</RedesignTopButton>
			}
		>
			<div className="mx-auto w-[min(1380px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[780px]:w-[calc(100%_-_24px)] max-[780px]:py-[22px]">
				<section className="mb-[22px] flex items-end justify-between gap-6 max-[780px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							立项审稿
						</h1>
						<p className="m-0 max-w-[740px] text-sm leading-6 text-[#69707d]">
							动笔之前先回答一个问题：这个故事值不值得写。审稿编辑会重建你的故事发动机，
							逐层审计，并把俗套点钉在你自己的原文上。
						</p>
					</div>
					<div className="flex gap-1 rounded-xl border border-[#e6e8eb] bg-white p-1 shadow-[0_4px_18px_rgba(22,27,34,.06)] max-[780px]:mt-4 max-[780px]:overflow-x-auto">
						{["粘贴灵感", "阅读审稿", "决定写不写"].map((label, index) => (
							<div
								key={label}
								className={`flex min-h-[34px] items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-xs ${
									index === 0 && !result
										? "bg-[#fff2ec] font-bold text-[#c94413]"
										: result && index > 0
											? "bg-[#fff2ec] font-bold text-[#c94413]"
											: "text-[#69707d]"
								}`}
							>
								<span
									className={`grid size-5 place-items-center rounded-full text-[11px] ${
										(index === 0 && !result) || (result && index > 0)
											? "bg-[#ff5a1f] text-white"
											: "bg-[#eef0f3]"
									}`}
								>
									{index + 1}
								</span>
								{label}
							</div>
						))}
					</div>
				</section>

				<section className="grid items-start gap-5 [grid-template-columns:minmax(0,1.55fr)_minmax(330px,.75fr)] max-[1100px]:grid-cols-1">
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<header className="border-b border-[#e6e8eb] px-5 py-[18px] pb-3.5">
							<h2 className="m-0 text-base font-bold leading-snug">你的故事灵感</h2>
							<p className="mt-1 text-xs text-[#69707d]">
								写下你目前的全部想法——哪怕只是几句话。不用组织语言，编辑会自己拆解。
							</p>
						</header>

						<div className="p-5">
							<div className="grid gap-3.5">
								<label className="grid gap-[7px]">
									<span className="text-xs font-bold text-[#4d535d]">题材</span>
									<select
										value={genre}
										onChange={(event) => onGenreChange(event.target.value)}
										className="min-h-[42px] w-full rounded-[10px] border border-[#d8dbe0] bg-white px-3 text-sm outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
									>
										{genreOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</label>

								<label className="grid gap-[7px]">
									<span className="text-xs font-bold text-[#4d535d]">
										灵感原文
									</span>
									<div className="relative">
										<textarea
											value={premiseText}
											onChange={(event) =>
												onPremiseTextChange(event.target.value)
											}
											placeholder={
												"例如：主角重生回高三，带着前世记忆避开所有遗憾……\n\n想到什么写什么，20 字以上即可开始审稿。"
											}
											className="min-h-[320px] w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3.5 py-[13px] text-sm leading-7 outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
										/>
										<span className="absolute bottom-2.5 right-3 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-[#69707d]">
											{charCount} 字（20-4000）
										</span>
									</div>
								</label>
							</div>

							<div className="flex items-center justify-between gap-3.5 pt-[18px] max-[780px]:flex-col max-[780px]:items-stretch">
								<div className="flex items-center gap-2 text-xs text-[#69707d]">
									<ShieldCheck className="size-4" />
									{isMockProvider
										? "演示模型只返回占位结构，连接真实模型后才有编辑判断。"
										: "审稿结论不会自动保存；确认发动机卡后才写入书籍病历。"}
								</div>
								<Button
									onClick={onRunReview}
									disabled={!canRun}
									className="min-h-11 min-w-[168px] rounded-[9px] bg-[#ff5a1f] font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.18)] hover:bg-[#e84b13]"
								>
									{isReviewing ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									开始审稿
								</Button>
							</div>
						</div>
					</div>

					<aside className="sticky top-[84px] grid gap-3.5 max-[1100px]:static">
						<div className="rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
							<header className="border-b border-[#e6e8eb] px-5 py-[18px] pb-3.5">
								<h2 className="m-0 text-base font-bold leading-snug">你将得到</h2>
								<p className="mt-1 text-xs text-[#69707d]">
									先给结论，再给可反驳的证据。
								</p>
							</header>
							<div className="p-5">
								<div className="grid gap-3">
									{[
										[
											"1",
											"三态判定",
											"值得写 / 可修补 / 暂不值得写——不是打分，是编辑决定。",
										],
										[
											"2",
											"发动机契约",
											"欲望、阻力、核心冲突被重写成可反驳的一句话，写偏了随时对照。",
										],
										[
											"3",
											"俗套证据",
											"每条俗套判定都引用你自己的原文，找不到原文的不算数。",
										],
										[
											"4",
											"升级方向",
											"情感 / 权谋 / 战争三个方向，只替换核心冲突，不新增设定。",
										],
									].map(([num, title, description]) => (
										<div key={num} className="flex items-start gap-[11px]">
											<div className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#eef4ff] text-xs font-extrabold text-[#2f6feb]">
												{num}
											</div>
											<div>
												<strong className="mb-0.5 block text-[13px]">
													{title}
												</strong>
												<span className="block text-xs text-[#69707d]">
													{description}
												</span>
											</div>
										</div>
									))}
								</div>
								<div className="mt-4 grid grid-cols-2 gap-2">
									<div className="rounded-[10px] border border-[#e6e8eb] bg-[#fafafa] p-2.5">
										<span className="block text-[11px] text-[#69707d]">
											预计耗时
										</span>
										<strong className="mt-0.5 block text-[13px]">
											30-60 秒
										</strong>
									</div>
									<div className="rounded-[10px] border border-[#e6e8eb] bg-[#fafafa] p-2.5">
										<span className="block text-[11px] text-[#69707d]">
											适合阶段
										</span>
										<strong className="mt-0.5 block text-[13px]">
											动笔之前 / 大改之前
										</strong>
									</div>
								</div>
							</div>
						</div>
						<div className="rounded-[11px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-[13px] text-xs leading-5 text-[#7f4a0c]">
							审稿编辑被约束为“先找理由拒绝”：多数灵感会得到“可修补”或更严的结论。
							这不是打击，是把几个月的写作风险提前到五分钟。
						</div>
					</aside>
				</section>

				{error && !result ? (
					<section className="mt-[22px] rounded-[14px] border border-[#f5d9a8] bg-[#fff7e6] p-4 text-[#7f4a0c]">
						<div className="flex items-start gap-3">
							<TriangleAlert className="mt-0.5 size-5 shrink-0" />
							<div>
								<strong>审稿未完成</strong>
								<p className="mt-1 text-sm leading-6">{error}</p>
							</div>
						</div>
					</section>
				) : null}

				{result ? (
					<>
						<PremiseReviewResultSection
							result={result}
							onWriteFirstChapter={onWriteFirstChapter}
							targetProjectName={targetProjectName}
							contract={contract}
							onContractChange={onContractChange}
							engineCard={engineCard}
							isSavingCard={isSavingCard}
							cardError={cardError}
							onSaveCard={onSaveCard}
							reviewByFindingId={reviewByFindingId}
							isSavingReview={isSavingReview}
							onReviewFinding={onReviewFinding}
						/>
						<PremiseConsultPanel
							provider={provider}
							premiseText={premiseText}
							genre={genre || undefined}
							review={result}
						/>
						<PremiseDialoguePanel
							provider={provider}
							projectId={projectId}
							premiseText={premiseText}
							genre={genre || undefined}
							review={result}
							onAdoptContract={onAdoptDialogueContract}
						/>
						<section className="mt-[22px]">
							<ReportQaPanel
								provider={provider}
								reportKind="premise-review"
								report={buildPremiseReviewQaReport(result)}
								sourceText={premiseText}
							/>
						</section>
					</>
				) : contract && engineCard ? (
					<section className="mt-[22px]">
						<EngineCardEditor
							contract={contract}
							onContractChange={onContractChange}
							engineCard={engineCard}
							isSaving={isSavingCard}
							error={cardError}
							onSave={onSaveCard}
							targetProjectName={targetProjectName}
						/>
					</section>
				) : null}
			</div>

			{isReviewing ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-[#f6f7f9]/90 backdrop-blur-sm">
					<div className="max-h-[86vh] w-[min(440px,calc(100%_-_30px))] overflow-y-auto rounded-[14px] border border-[#e6e8eb] bg-white p-[22px] shadow-[0_12px_34px_rgba(22,27,34,.07)]">
						<h3 className="mb-[11px] text-base font-bold">正在审稿</h3>
						<div className="flex items-start gap-3 rounded-[11px] border border-[#d8e2f6] bg-[#edf4ff] p-3 text-xs leading-5 text-[#405a85]">
							<Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
							<div>
								<strong className="block text-[#2f5faa]">
									编辑正在重建故事发动机
								</strong>
								<span className="mt-0.5 block">
									已等待 {elapsedSeconds}{" "}
									秒。审稿是一次完整的模型调用，中间没有可展示的分步结果——完成后一次性给出。
								</span>
							</div>
						</div>
						<p className="mb-2 mt-3.5 text-xs font-bold text-[#4d535d]">
							等待时先看：编辑会检验这四层
						</p>
						<div className="grid gap-1.5">
							{PREMISE_REVIEW_LAYERS.map((key, index) => (
								<div
									key={key}
									className="flex items-start gap-2.5 rounded-[10px] border border-[#eceef1] bg-[#f7f8fa] px-3 py-2 text-xs leading-5"
								>
									<span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#eef4ff] text-[11px] font-extrabold text-[#2f6feb]">
										{index + 1}
									</span>
									<div>
										<strong className="text-[#303640]">
											{PREMISE_LAYER_META[key].label}
										</strong>
										<span className="block text-[#69707d]">
											{PREMISE_LAYER_META[key].question}
										</span>
									</div>
								</div>
							))}
						</div>
						<p className="mt-3 text-[11px] leading-5 text-[#9aa1ab]">
							这份清单是审稿的检验维度，不是实时进度；每层的结论要等审稿完成才可靠。
						</p>
					</div>
				</div>
			) : null}
		</RedesignWorkspaceShell>
	);
}

function PremiseReviewResultSection({
	result,
	onWriteFirstChapter,
	targetProjectName,
	contract,
	onContractChange,
	engineCard,
	isSavingCard,
	cardError,
	onSaveCard,
	reviewByFindingId,
	isSavingReview,
	onReviewFinding,
}: {
	result: PremiseReviewResult;
	onWriteFirstChapter: () => void;
	targetProjectName: string;
	contract: PremiseContractDraft | null;
	onContractChange: (field: keyof PremiseContractDraft, value: string) => void;
	engineCard: PremiseEngineCard | null;
	isSavingCard: boolean;
	cardError: string | null;
	onSaveCard: (status: "draft" | "confirmed") => void;
	reviewByFindingId: Map<string, PremiseFindingReview>;
	isSavingReview: boolean;
	onReviewFinding: (findingId: string, reviewState: PremiseFindingDecision) => void;
}) {
	const meta = verdictMeta[result.engineVerdict];

	return (
		<section className="mt-[22px]">
			<div className={`mb-4 rounded-[14px] border px-5 py-4 ${meta.bannerClass}`}>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<span
							className={`rounded-full px-[10px] py-1 text-xs font-bold ${meta.chipClass}`}
						>
							{meta.label}
						</span>
						<strong className="text-[15px] leading-6 text-inherit">
							{result.oneLineVerdict || "编辑未给出一句话结论。"}
						</strong>
					</div>
					{result.verification ? (
						<span className="text-[11px] text-inherit opacity-80">
							俗套复核：{result.verification.verifiedCount} 条已确认 /{" "}
							{result.verification.rejectedCount} 条被拒 /{" "}
							{result.verification.unavailableCount} 条未复核
						</span>
					) : null}
				</div>
			</div>

			<div className="grid items-start gap-5 [grid-template-columns:minmax(0,1fr)_340px] max-[1100px]:grid-cols-1">
				<div className="grid gap-3.5">
					{contract ? (
						<EngineCardEditor
							contract={contract}
							onContractChange={onContractChange}
							engineCard={engineCard}
							isSaving={isSavingCard}
							error={cardError}
							onSave={onSaveCard}
							targetProjectName={targetProjectName}
						/>
					) : null}

					<SectionCard
						title="四层审计"
						subtitle="故事发动机、主角欲望、持续冲突、不可替代性——逐层判定。"
					>
						<div className="grid gap-2.5 md:grid-cols-2">
							{PREMISE_REVIEW_LAYERS.map((key) => {
								const layer = result.layers.find((item) => item.layer === key);
								const status = layer?.status ?? "missing";
								const statusMeta = layerStatusMeta[status];
								return (
									<article
										key={key}
										className="rounded-xl border border-[#e6e8eb] p-4"
									>
										<div className="flex items-center justify-between gap-3">
											<h3 className="m-0 text-[14px] font-bold">
												{PREMISE_LAYER_META[key].label}
											</h3>
											<span
												className={`rounded-full px-[9px] py-1 text-[11px] font-bold ${statusMeta.chipClass}`}
											>
												{statusMeta.label}
											</span>
										</div>
										<p className="mt-1.5 text-xs leading-5 text-[#69707d]">
											{PREMISE_LAYER_META[key].question}
										</p>
										<p className="mt-2 text-[13px] leading-6 text-[#545b66]">
											{layer?.statement || "编辑未给出该层判断。"}
										</p>
										{layer?.comment ? (
											<p className="mt-1.5 text-xs leading-5 text-[#955208]">
												{layer.comment}
											</p>
										) : null}
									</article>
								);
							})}
						</div>
					</SectionCard>

					{result.clicheFindings.length ? (
						<SectionCard
							title="俗套点"
							subtitle="每条判定都引用你的原文；引文对不上的已被服务端剔除。"
							badge={`${result.clicheFindings.length} 条`}
						>
							<div className="grid gap-3">
								{result.clicheFindings.map((finding) => (
									<article
										key={finding.id}
										className="rounded-xl border border-l-4 border-[#e6e8eb] border-l-[#c46a06] p-4"
									>
										<div className="flex items-start justify-between gap-3.5">
											<div>
												<h3 className="m-0 text-[15px] font-bold">
													{finding.title}
												</h3>
												<p className="mt-1.5 text-sm leading-6 text-[#545b66]">
													{finding.claim}
												</p>
											</div>
											<div className="flex shrink-0 flex-col items-end gap-1.5">
												<span className="rounded-full bg-[#fff0f0] px-[9px] py-1 text-[11px] font-bold text-[#a82f2d]">
													严重度{" "}
													{severityLabels[finding.severity] ?? "中"}
												</span>
												<span
													className={`rounded-full px-[9px] py-1 text-[11px] font-bold ${findingStatusMeta[finding.status]}`}
												>
													{findingStatusLabels[finding.status]}
												</span>
											</div>
										</div>
										{finding.evidence.length ? (
											<div className="mt-3 grid gap-2">
												{finding.evidence.map((quote, index) => (
													<blockquote
														key={`${finding.id}-${index}`}
														className="m-0 rounded-[10px] border border-[#eceef1] bg-[#f7f8fa] px-3.5 py-2.5 text-[13px] leading-6 text-[#464d57]"
													>
														<b className="mb-0.5 block text-xs text-[#303640]">
															你的原文
														</b>
														{quote.quote}
														{quote.note ? (
															<span className="mt-1 block text-[11px] text-[#69707d]">
																{quote.note}
															</span>
														) : null}
													</blockquote>
												))}
											</div>
										) : (
											<p className="mt-3 rounded-[10px] border border-[#f0c3c2] bg-[#fff0f0] px-3.5 py-2.5 text-xs leading-5 text-[#a82f2d]">
												该判定的引文未能在你的原文中定位，已被服务端拒绝。
											</p>
										)}
										{finding.patternReference ? (
											<p className="mt-2 text-xs text-[#69707d]">
												撞上的泛滥模式：{finding.patternReference}
											</p>
										) : null}
										{finding.suggestion ? (
											<div className="mt-2.5 rounded-[10px] bg-[#fff2ec] px-3 py-[11px] text-xs leading-5 text-[#7a381c]">
												<b className="mb-0.5 block text-[#b63f12]">
													破套动作
												</b>
												{finding.suggestion}
											</div>
										) : null}
										{finding.verificationNote ? (
											<p className="mt-2 text-[11px] leading-5 text-[#9aa1ab]">
												{finding.verificationNote}
											</p>
										) : null}
										{finding.evidence.length ? (
											<FindingDecisionRow
												findingId={finding.id}
												current={
													reviewByFindingId.get(finding.id)
														?.reviewState ?? null
												}
												disabled={isSavingReview || !result.reviewId}
												onReview={onReviewFinding}
											/>
										) : null}
									</article>
								))}
							</div>
						</SectionCard>
					) : null}

					{result.upgradeDirections.length ? (
						<SectionCard
							title="升级方向"
							subtitle="只替换核心冲突，不新增设定、金手指或人物。"
						>
							<div className="grid gap-3 md:grid-cols-3">
								{result.upgradeDirections.map((direction) => (
									<article
										key={direction.directionId}
										className="rounded-xl border border-[#e6e8eb] p-4"
									>
										<span className="rounded-full bg-[#eef4ff] px-[9px] py-1 text-[11px] font-bold text-[#295ec2]">
											{
												PREMISE_UPGRADE_ORIENTATION_LABELS[
													direction.orientation
												]
											}
										</span>
										<h3 className="mb-1.5 mt-2.5 text-[14px] font-bold leading-6">
											{direction.pitch}
										</h3>
										<p className="text-[13px] leading-6 text-[#545b66]">
											{direction.changedConflict}
										</p>
										{direction.preservedElements?.length ? (
											<p className="mt-2 text-xs leading-5 text-[#69707d]">
												保留：{direction.preservedElements.join("、")}
											</p>
										) : null}
										{direction.risk ? (
											<p className="mt-1 text-xs leading-5 text-[#955208]">
												代价：{direction.risk}
											</p>
										) : null}
									</article>
								))}
							</div>
						</SectionCard>
					) : null}
				</div>

				<aside className="sticky top-[84px] grid gap-3.5 max-[1100px]:static">
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-5 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<div className="grid gap-[9px]">
							<Button
								className="w-full rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
								onClick={onWriteFirstChapter}
							>
								<PenLine className="mr-2 size-4" />
								去写第一章
							</Button>
							<p className="m-0 text-center text-[11px] leading-5 text-[#69707d]">
								决定写：带着发动机契约进入章节初诊。
								<br />
								决定不写：换个灵感再来，比写崩三十章便宜。
							</p>
						</div>
					</div>
					<div className="rounded-[11px] border border-[#e6e8eb] bg-white px-3.5 py-[13px] text-xs leading-5 text-[#69707d]">
						确认后的发动机卡进入《{targetProjectName}》的病历与阶段轨（阶段①达成）；
						俗套点判定随本次审稿记录保存，可在导出包中反查。
					</div>
				</aside>
			</div>
		</section>
	);
}

function EngineCardEditor({
	contract,
	onContractChange,
	engineCard,
	isSaving,
	error,
	onSave,
	targetProjectName,
}: {
	contract: PremiseContractDraft;
	onContractChange: (field: keyof PremiseContractDraft, value: string) => void;
	engineCard: PremiseEngineCard | null;
	isSaving: boolean;
	error: string | null;
	onSave: (status: "draft" | "confirmed") => void;
	targetProjectName: string;
}) {
	const canSave = contract.coreConflict.trim().length > 0 && !isSaving;
	const copyText = buildEngineContractText(contract);

	return (
		<SectionCard
			title="发动机卡（编辑的重述，可改写后确认）"
			subtitle={`写偏了随时回来对照；确认后写入《${targetProjectName}》的病历，成为阶段①的达成依据。`}
			action={
				<Button
					variant="outline"
					className="rounded-[9px] border-[#d8dbe0]"
					onClick={() => {
						void navigator.clipboard?.writeText(copyText);
					}}
				>
					<Clipboard className="mr-2 size-4" />
					复制契约
				</Button>
			}
		>
			{engineCard ? (
				<div
					className={`mb-3 flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2 text-xs ${
						engineCard.status === "confirmed"
							? "bg-[#e6f6ec] text-[#1f6b3a]"
							: "bg-[#f7f8fa] text-[#69707d]"
					}`}
				>
					<FileCheck2 className="size-4" />
					<span>
						当前保存状态：{PREMISE_ENGINE_CARD_STATUS_LABELS[engineCard.status]}
						{engineCard.status === "confirmed" && engineCard.confirmedAt
							? `（${new Date(engineCard.confirmedAt).toLocaleString("zh-CN")} 确认）`
							: ""}
					</span>
					<span className="text-[11px] opacity-70">重新保存会覆盖已存的卡片。</span>
				</div>
			) : null}

			<label className="grid gap-[7px]">
				<span className="text-xs font-bold text-[#4d535d]">故事概述（编辑重述）</span>
				<textarea
					value={contract.premiseSummary}
					onChange={(event) => onContractChange("premiseSummary", event.target.value)}
					className="min-h-[72px] w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3 py-2 text-[13px] leading-6 outline-none focus:border-[#ff8b5f]"
				/>
			</label>
			<div className="mt-3 grid gap-2.5">
				{contractFields.map((field) => (
					<label key={field.key} className="grid gap-[6px]">
						<span className="text-[11px] font-bold text-[#69707d]">{field.label}</span>
						<textarea
							value={contract[field.key]}
							onChange={(event) => onContractChange(field.key, event.target.value)}
							className="min-h-[52px] w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3 py-2 text-[13px] leading-6 outline-none focus:border-[#ff8b5f]"
						/>
					</label>
				))}
			</div>

			{error ? (
				<p className="mt-3 rounded-[10px] border border-[#f0c3c2] bg-[#fff0f0] px-3 py-2 text-xs leading-5 text-[#a82f2d]">
					{error}
				</p>
			) : null}

			<div className="mt-4 flex flex-wrap items-center gap-2.5">
				<Button
					variant="outline"
					className="rounded-[9px] border-[#d8dbe0]"
					disabled={!canSave}
					onClick={() => onSave("draft")}
				>
					{isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
					保存为草稿
				</Button>
				<Button
					className="rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
					disabled={!canSave}
					onClick={() => onSave("confirmed")}
				>
					{isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
					确认发动机契约
				</Button>
				<span className="text-[11px] leading-5 text-[#69707d]">
					核心冲突为必填；确认动作可以随时重做（改写后再确认会覆盖）。
				</span>
			</div>
		</SectionCard>
	);
}

function FindingDecisionRow({
	findingId,
	current,
	disabled,
	onReview,
}: {
	findingId: string;
	current: PremiseFindingReviewState | null;
	disabled: boolean;
	onReview: (findingId: string, reviewState: PremiseFindingDecision) => void;
}) {
	return (
		<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-[#eceef1] pt-3">
			<span className="text-[11px] font-bold text-[#69707d]">你的判定：</span>
			{findingDecisionOptions.map((state) => (
				<Button
					key={state}
					type="button"
					variant={current === state ? "default" : "outline"}
					disabled={disabled}
					onClick={() => onReview(findingId, state)}
					className="min-h-8 rounded-md px-2.5 text-xs"
				>
					{PREMISE_FINDING_REVIEW_STATE_LABELS[state]}
				</Button>
			))}
			{current ? (
				<span className="rounded-full bg-primary px-[9px] py-1 text-[11px] font-bold text-primary-foreground">
					{PREMISE_FINDING_REVIEW_STATE_LABELS[current]}
				</span>
			) : null}
		</div>
	);
}

function SectionCard({
	title,
	subtitle,
	badge,
	action,
	children,
}: {
	title: string;
	subtitle: string;
	badge?: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<header className="flex items-center justify-between gap-4 border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-[18px] pb-3.5">
				<div>
					<h2 className="m-0 text-base font-bold leading-snug">{title}</h2>
					<p className="mt-1 text-xs text-[#69707d]">{subtitle}</p>
				</div>
				{action ??
					(badge ? (
						<span className="rounded-full bg-[#fff0f0] px-[9px] py-1 text-[11px] font-bold text-[#a82f2d]">
							{badge}
						</span>
					) : null)}
			</header>
			<div className="p-5">{children}</div>
		</div>
	);
}

function buildEngineContractText(contract: PremiseContractDraft | null): string {
	if (!contract) {
		return "";
	}

	return [
		"【故事发动机契约】",
		`核心冲突：${contract.coreConflict}`,
		`主角欲望：${contract.protagonistDesire}`,
		`对立阻力：${contract.opposingForce}`,
		`不可替代性测试：${contract.irreducibilityTest}`,
		`读者钩子问题：${contract.readerHookQuestion}`,
	].join("\n");
}
