"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import {
	PREMISE_LAYER_META,
	PREMISE_REVIEW_LAYERS,
	PREMISE_UPGRADE_ORIENTATION_LABELS,
	type PremiseReviewResult,
	type PremiseReviewVerdict,
} from "@ai-novel-diagnosis/ai-core";
import { Clipboard, Loader2, PenLine, ShieldCheck, TriangleAlert } from "lucide-react";

export interface PremiseReviewComposeProps {
	providerLabel: string;
	isMockProvider: boolean;
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

export function PremiseReviewCompose(props: PremiseReviewComposeProps) {
	const {
		providerLabel,
		isMockProvider,
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
	} = props;

	const charCount = premiseText.trim().length;
	const canRun = !isReviewing && charCount >= 20 && charCount <= 4000;
	const engineContractText = useMemo(() => buildEngineContractText(result), [result]);

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
										: "审稿结论只保存在当前页面，不会写入书籍病历。"}
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
					<PremiseReviewResultSection
						result={result}
						engineContractText={engineContractText}
						onWriteFirstChapter={onWriteFirstChapter}
					/>
				) : null}
			</div>

			{isReviewing ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-[#f6f7f9]/90 backdrop-blur-sm">
					<div className="w-[min(390px,calc(100%_-_30px))] rounded-[14px] border border-[#e6e8eb] bg-white p-[22px] shadow-[0_12px_34px_rgba(22,27,34,.07)]">
						<h3 className="mb-[11px] text-base font-bold">正在审稿</h3>
						<div className="flex items-start gap-3 rounded-[11px] border border-[#d8e2f6] bg-[#edf4ff] p-3 text-xs leading-5 text-[#405a85]">
							<Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
							<div>
								<strong className="block text-[#2f5faa]">
									编辑正在重建故事发动机
								</strong>
								<span className="mt-0.5 block">
									已等待 {elapsedSeconds}{" "}
									秒。四层审计和俗套复核完成后会在这里展示。
								</span>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</RedesignWorkspaceShell>
	);
}

function PremiseReviewResultSection({
	result,
	engineContractText,
	onWriteFirstChapter,
}: {
	result: PremiseReviewResult;
	engineContractText: string;
	onWriteFirstChapter: () => void;
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
					<SectionCard
						title="故事发动机契约"
						subtitle="编辑对你故事的重述——写偏了随时回来对照。"
						action={
							<Button
								variant="outline"
								className="rounded-[9px] border-[#d8dbe0]"
								onClick={() => {
									void navigator.clipboard?.writeText(engineContractText);
								}}
							>
								<Clipboard className="mr-2 size-4" />
								复制契约
							</Button>
						}
					>
						<p className="m-0 rounded-[10px] bg-[#f7f8fa] px-3.5 py-3 text-[13px] leading-6 text-[#464d57]">
							{result.premiseSummary}
						</p>
						<div className="mt-3 grid gap-2.5">
							{(
								[
									["核心冲突", result.coreConflict],
									["主角欲望", result.protagonistDesire],
									["对立阻力", result.opposingForce],
									["不可替代性测试", result.irreducibilityTest],
									["读者钩子问题", result.readerHookQuestion],
								] as const
							).map(([label, value]) => (
								<div
									key={label}
									className="rounded-[10px] border border-[#e6e8eb] px-3.5 py-2.5"
								>
									<span className="block text-[11px] text-[#69707d]">
										{label}
									</span>
									<strong className="mt-0.5 block text-[13px] font-normal leading-6">
										{value || "（编辑未填写）"}
									</strong>
								</div>
							))}
						</div>
					</SectionCard>

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
						本页结论暂不写入书籍病历；发动机卡的确认与保存属于下一步（阶段①闭环）。
					</div>
				</aside>
			</div>
		</section>
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

function buildEngineContractText(result: PremiseReviewResult | null): string {
	if (!result) {
		return "";
	}

	return [
		"【故事发动机契约】",
		`核心冲突：${result.coreConflict}`,
		`主角欲望：${result.protagonistDesire}`,
		`对立阻力：${result.opposingForce}`,
		`不可替代性测试：${result.irreducibilityTest}`,
		`读者钩子问题：${result.readerHookQuestion}`,
	].join("\n");
}
