"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookMarked, Clock, HelpCircle, Lightbulb, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { ProjectAssetTabs } from "./ProjectAssetTabs";

export function ProjectMethodologyPage() {
	const router = useRouter();
	const { activeProject, projectRevisionSessions, projectMethodologyCards, providerLabel } =
		useWorkspaceHandlers("overview");

	const latestUpdate = projectMethodologyCards.length
		? new Date(
				projectMethodologyCards[projectMethodologyCards.length - 1].lastSeenAt,
			).toLocaleString()
		: "暂无";

	return (
		<RedesignWorkspaceShell
			active="history"
			providerLabel={providerLabel}
			crumb={
				<>
					我的书籍 / <b className="text-[#1f2329]">方法论库</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton onClick={() => router.push("/project/current")}>
						返回书籍
					</RedesignTopButton>
					<RedesignTopButton
						variant="primary"
						onClick={() => router.push("/diagnose/quick")}
					>
						快速诊断一章
					</RedesignTopButton>
				</>
			}
		>
			<main className="mx-auto w-[min(1080px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[820px]:w-[calc(100%_-_24px)] max-[820px]:py-[22px]">
				<section className="mb-[22px] flex items-start justify-between gap-6 max-[720px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							方法论库
						</h1>
						<p className="max-w-[720px] text-sm leading-6 text-[#69707d]">
							把诊断意见提炼成可复用的改稿套路，沉淀为这本书自己的写作规则和自查问题。
						</p>
					</div>
					<div className="rounded-full border border-[#ffd6c4] bg-[#fff2ec] px-3 py-1 text-xs font-bold text-[#c94413] max-[720px]:mt-4 max-[720px]:inline-flex">
						{projectMethodologyCards.length} 张卡片
					</div>
				</section>

				<section className="mb-4 grid gap-3 md:grid-cols-4">
					<SummaryCard label="当前书籍" value={activeProject?.name || "默认书籍"} />
					<SummaryCard label="方法论卡" value={`${projectMethodologyCards.length} 张`} />
					<SummaryCard label="修改记录" value={`${projectRevisionSessions.length} 条`} />
					<SummaryCard label="最近添加" value={latestUpdate} />
				</section>

				<ProjectAssetTabs
					active="methodology"
					revisionCount={projectRevisionSessions.length}
					methodologyCount={projectMethodologyCards.length}
				/>

				<section className="mt-4">
					{projectMethodologyCards.length === 0 ? (
						<div className="rounded-[16px] border border-dashed border-[#d8dbe0] bg-white px-6 py-14 text-center shadow-[0_8px_24px_rgba(22,27,34,.055)]">
							<div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-[#fff2ec] text-[#ff5a1f]">
								<Lightbulb className="size-6" />
							</div>
							<h2 className="mt-4 text-lg font-bold">暂无方法论卡</h2>
							<p className="mx-auto mt-2 max-w-[460px] text-sm leading-6 text-[#69707d]">
								完成快速诊断后，系统会从问题、证据和修改建议里提炼可复用的改稿规则。
							</p>
							<Button
								onClick={() => router.push("/diagnose/quick")}
								className="mt-6 min-h-10 rounded-[9px] bg-[#ff5a1f] px-4 font-bold text-white hover:bg-[#e84b13]"
							>
								<ArrowLeft className="mr-2 size-4" />
								返回快速诊断
							</Button>
						</div>
					) : (
						<div className="grid gap-3 md:grid-cols-2">
							{projectMethodologyCards.map((card) => (
								<article
									key={card.projectCardId}
									className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_6px_20px_rgba(22,27,34,.055)]"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#fff2ec] text-[#ff5a1f]">
													<BookMarked className="size-4" />
												</span>
												<h2 className="truncate text-base font-bold">
													{card.title || "未命名方法论"}
												</h2>
											</div>
											<div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#69707d]">
												<span className="inline-flex items-center gap-1">
													<Clock className="size-3.5" />
													{new Date(card.lastSeenAt).toLocaleString()}
												</span>
												<span>来源：诊断提炼</span>
											</div>
										</div>
										{card.type ? (
											<span className="shrink-0 rounded-full bg-[#eef7f2] px-2.5 py-1 text-[11px] font-bold text-[#176e50]">
												{card.type}
											</span>
										) : null}
									</div>

									<div className="mt-4 grid gap-2">
										{card.triggerProblem ? (
											<InfoBlock
												icon={
													<Sparkles className="size-4 text-[#ff5a1f]" />
												}
												title="触发问题"
												body={card.triggerProblem}
											/>
										) : null}
										{card.reusableRule ? (
											<InfoBlock
												icon={
													<Lightbulb className="size-4 text-[#ff5a1f]" />
												}
												title="修改规则"
												body={card.reusableRule}
												expanded
											/>
										) : null}
										{card.selfCheckQuestion ? (
											<InfoBlock
												icon={
													<HelpCircle className="size-4 text-[#ff5a1f]" />
												}
												title="自查问题"
												body={card.selfCheckQuestion}
											/>
										) : null}
									</div>

									<div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eceef1] pt-3 max-[640px]:block">
										<p className="text-xs text-[#69707d]">
											用于后续章节复查同类问题，避免同一类写法反复返工。
										</p>
										<Button
											variant="outline"
											className="min-h-9 rounded-[9px] border-[#d8dbe0] max-[640px]:mt-3"
											onClick={() => router.push("/diagnose/quick")}
										>
											查看诊断
										</Button>
									</div>
								</article>
							))}
						</div>
					)}
				</section>
			</main>
		</RedesignWorkspaceShell>
	);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<span className="text-[11px] text-[#69707d]">{label}</span>
			<strong className="mt-1 block truncate text-sm">{value}</strong>
		</div>
	);
}

function InfoBlock({
	icon,
	title,
	body,
	expanded = false,
}: {
	icon: ReactNode;
	title: string;
	body: string;
	expanded?: boolean;
}) {
	return (
		<div className="rounded-[11px] border border-[#eceef1] bg-[#fafbfc] p-3">
			<h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
				{icon}
				{title}
			</h3>
			<p
				className={`whitespace-pre-wrap text-sm leading-6 text-[#505762] ${
					expanded ? "line-clamp-5" : "line-clamp-3"
				}`}
			>
				{body}
			</p>
		</div>
	);
}
