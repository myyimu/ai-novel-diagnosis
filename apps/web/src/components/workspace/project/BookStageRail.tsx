"use client";

import type { BookStageSummary } from "@/lib/book-stage";

/**
 * 书籍旅程阶段轨（docs/information-architecture.md §3-§4）。
 * 状态全部由 deriveBookStage 派生：实心 = 已达成，橙圈 = 有待办，
 * 空心 = 可进未进，虚线 = 功能未上线的虚位。下方常驻"下一步"动作。
 */
export function BookStageRail({
	summary,
	onNavigate,
}: {
	summary: BookStageSummary;
	onNavigate: (href: string) => void;
}) {
	const nextAction = summary.nextAction;

	return (
		<div className="mt-4">
			<ol className="m-0 flex list-none items-center gap-0 p-0">
				{summary.stages.map((stage, i) => {
					const isLast = i === summary.stages.length - 1;
					const dotClass = !stage.available
						? "border-dashed border-[#d4d8de] bg-transparent"
						: stage.reached
							? "border-[#ff5a1f] bg-[#ff5a1f]"
							: stage.pending
								? "border-[#ff8a5c] bg-white"
								: "border-[#d4d8de] bg-white";
					const labelClass = !stage.available
						? "text-[#b3b9c2]"
						: stage.reached || stage.pending
							? "text-[#1f2329] font-bold"
							: "text-[#69707d]";
					return (
						<li key={stage.key} className="flex min-w-0 items-center">
							<span className="flex shrink-0 items-center gap-1.5">
								<span
									title={`${stage.label}：${stage.description}${stage.available ? "" : "（未上线）"}`}
									aria-label={`阶段${stage.index} ${stage.label}：${stage.description}`}
									className={`block size-[9px] rounded-full border ${dotClass}`}
								/>
								<span className={`text-[11px] leading-none ${labelClass}`}>
									{stage.label}
								</span>
							</span>
							{!isLast && (
								<span
									aria-hidden="true"
									className={`mx-1.5 h-px w-4 shrink-0 ${stage.reached ? "bg-[#ffc3aa]" : "bg-[#edf0f3]"}`}
								/>
							)}
						</li>
					);
				})}
			</ol>
			{nextAction && (
				<button
					type="button"
					onClick={() => onNavigate(nextAction.href)}
					className="mt-3 flex w-full items-center justify-between rounded-[9px] border border-[#ffc3aa] bg-[#fff7f2] px-3 py-2 text-left text-xs font-bold text-[#c2410c] transition hover:border-[#ff8a5c] hover:bg-[#fff2ec]"
				>
					<span>下一步：{nextAction.label}</span>
					<span aria-hidden="true">→</span>
				</button>
			)}
		</div>
	);
}
