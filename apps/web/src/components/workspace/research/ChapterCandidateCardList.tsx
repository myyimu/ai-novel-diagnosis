import type { BookAnalysisJob } from "@/stores/workspace-types";

export type ChapterCandidateCard = NonNullable<
	BookAnalysisJob["partialResult"]
>["candidateChapterCards"] extends Array<infer T> | undefined
	? T
	: never;

/** 展示最近完成的章节，长书只渲染最近这些（服务端本身也只保留最近 80 张）。 */
const VISIBLE_CARD_LIMIT = 12;

const DEPTH_LABELS: Record<ChapterCandidateCard["depth"], string> = {
	deep: "深拆",
	outline: "轻索引",
};

/**
 * 章节初核卡列表（P2-T2 深水区）：map 每章完成时从服务端真实事件渐进渲染。
 * 诚实口径——初核卡只收录带机械锚定原文的章节；摘要与信号是章级模型陈述，
 * 未逐条锚定、未复核，跨章复核与最终判定（含被拒披露）以故事体检报告为准。
 */
export function ChapterCandidateCardList({ cards }: { cards: ChapterCandidateCard[] }) {
	if (!cards.length) {
		return null;
	}

	const visible = [...cards].reverse().slice(0, VISIBLE_CARD_LIMIT);
	const hiddenCount = cards.length - visible.length;

	return (
		<div>
			<div className="mb-2 flex items-center justify-between text-xs">
				<span>章节初核（已完成 {cards.length} 章，最近完成在前）</span>
				<span className="text-[10px] text-[#9aa1ab]">初核 ≠ 复核</span>
			</div>
			<div className="grid gap-2">
				{visible.map((card) => (
					<article
						key={card.chapterId}
						className="rounded-[10px] border border-[#eceef1] bg-[#f9fafb] px-3 py-2.5"
					>
						<header className="flex flex-wrap items-center gap-1.5">
							<strong className="text-xs text-[#303640]">{card.title}</strong>
							<span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-[10px] font-bold text-[#59606b]">
								{DEPTH_LABELS[card.depth]}
							</span>
							<span className="rounded-full bg-[#fff7e6] px-2 py-0.5 text-[10px] font-bold text-[#955208]">
								初核
							</span>
						</header>
						{card.summary ? (
							<p className="mt-1 text-[11px] leading-5 text-[#6f7782]">
								摘要（未复核）：{card.summary}
							</p>
						) : null}
						{card.anchoredQuotes.map((anchor, index) => (
							<blockquote
								key={`${card.chapterId}-${index}`}
								className="mt-1.5 mb-0 border-l-2 border-[#c9a06a] pl-2 text-[11px] leading-5 text-[#464d57]"
							>
								原文锚点：{anchor.quote}
							</blockquote>
						))}
						{card.riskSignals.length || card.setupSignals.length ? (
							<p className="mt-1.5 text-[11px] leading-5 text-[#955208]">
								{card.riskSignals.length
									? `风险信号（未复核）：${card.riskSignals.join("；")}`
									: null}
								{card.riskSignals.length && card.setupSignals.length ? "。" : null}
								{card.setupSignals.length
									? `伏笔（是否回收需全书判定）：${card.setupSignals.join("；")}`
									: null}
							</p>
						) : null}
					</article>
				))}
			</div>
			{hiddenCount > 0 ? (
				<p className="mt-2 text-[10px] leading-5 text-[#9aa1ab]">
					另有 {hiddenCount} 章的初核卡已入记录，这里只展示最近 {VISIBLE_CARD_LIMIT}{" "}
					章；完整复核结论以故事体检报告为准。
				</p>
			) : null}
			<p className="mt-2 text-[10px] leading-5 text-[#9aa1ab]">
				初核卡只收录带原文锚点的章节；信号是章级模型陈述，未逐条锚定、未复核。
			</p>
		</div>
	);
}
