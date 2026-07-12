"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, FileText, ListChecks, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { ProjectAssetTabs } from "./ProjectAssetTabs";

export function ProjectRevisionsPage() {
	const router = useRouter();
	const { activeProject, projectRevisionSessions, projectMethodologyCards, providerLabel } =
		useWorkspaceHandlers("overview");

	const latestUpdate = projectRevisionSessions.length
		? new Date(
				projectRevisionSessions[projectRevisionSessions.length - 1].createdAt,
			).toLocaleString()
		: "暂无";

	return (
		<RedesignWorkspaceShell
			active="history"
			providerLabel={providerLabel}
			crumb={
				<>
					我的书籍 / <b className="text-[#1f2329]">修改效果</b>
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
							修改效果
						</h1>
						<p className="max-w-[720px] text-sm leading-6 text-[#69707d]">
							沉淀每轮诊断后的改稿指令、复诊结果和备注，帮助同一本书持续追踪修改质量。
						</p>
					</div>
					<div className="rounded-full border border-[#ffd6c4] bg-[#fff2ec] px-3 py-1 text-xs font-bold text-[#c94413] max-[720px]:mt-4 max-[720px]:inline-flex">
						{projectRevisionSessions.length} 条记录
					</div>
				</section>

				<section className="mb-4 grid gap-3 md:grid-cols-4">
					<SummaryCard label="当前书籍" value={activeProject?.name || "默认书籍"} />
					<SummaryCard label="修改记录" value={`${projectRevisionSessions.length} 条`} />
					<SummaryCard label="方法论卡" value={`${projectMethodologyCards.length} 条`} />
					<SummaryCard label="最近更新" value={latestUpdate} />
				</section>

				<ProjectAssetTabs
					active="revisions"
					revisionCount={projectRevisionSessions.length}
					methodologyCount={projectMethodologyCards.length}
				/>

				<section className="mt-4">
					{projectRevisionSessions.length === 0 ? (
						<div className="rounded-[16px] border border-dashed border-[#d8dbe0] bg-white px-6 py-14 text-center shadow-[0_8px_24px_rgba(22,27,34,.055)]">
							<div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-[#fff2ec] text-[#ff5a1f]">
								<RotateCcw className="size-6" />
							</div>
							<h2 className="mt-4 text-lg font-bold">暂无修改效果记录</h2>
							<p className="mx-auto mt-2 max-w-[460px] text-sm leading-6 text-[#69707d]">
								完成快速诊断并生成改稿计划后，系统会把修改指令和复诊结果保存到这里。
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
						<div className="grid gap-3">
							{projectRevisionSessions.map((session, index) => (
								<article
									key={session.id}
									className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_6px_20px_rgba(22,27,34,.055)]"
								>
									<div className="flex items-start justify-between gap-4 max-[640px]:block">
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#fff2ec] text-xs font-black text-[#ff5a1f]">
													{index + 1}
												</span>
												<h2 className="truncate text-base font-bold">
													{session.chapterTitle || "未命名章节"}
												</h2>
											</div>
											<div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#69707d]">
												<span className="inline-flex items-center gap-1">
													<Clock className="size-3.5" />
													{new Date(session.createdAt).toLocaleString()}
												</span>
												<span>{session.textLength} 字</span>
												<span>来源：快速诊断</span>
											</div>
										</div>
										<span className="rounded-full bg-[#eef7f2] px-2.5 py-1 text-[11px] font-bold text-[#176e50] max-[640px]:mt-3 max-[640px]:inline-flex">
											已沉淀
										</span>
									</div>

									<div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_.9fr]">
										<div className="rounded-[11px] border border-[#eceef1] bg-[#fafbfc] p-3">
											<h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
												<ListChecks className="size-4 text-[#ff5a1f]" />
												修改指令
											</h3>
											<p className="line-clamp-3 text-sm leading-6 text-[#505762]">
												{session.nextPrompt || "暂无修改指令"}
											</p>
										</div>
										<div className="rounded-[11px] border border-[#eceef1] bg-white p-3">
											<h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
												<FileText className="size-4 text-[#ff5a1f]" />
												备注
											</h3>
											<p className="line-clamp-3 text-sm leading-6 text-[#69707d]">
												{session.revisionNote ||
													"暂无备注，可在后续复诊中补充。"}
											</p>
										</div>
									</div>

									<div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eceef1] pt-3 max-[640px]:block">
										<p className="text-xs text-[#69707d]">
											用于回看上一轮改稿目标，也可以进入章节页继续复诊。
										</p>
										<div className="flex gap-2 max-[640px]:mt-3">
											<Button
												variant="outline"
												className="min-h-9 rounded-[9px] border-[#d8dbe0]"
												onClick={() => router.push("/project/current")}
											>
												打开书籍
											</Button>
											<Button
												className="min-h-9 rounded-[9px] bg-[#ff5a1f] px-3 font-bold text-white hover:bg-[#e84b13]"
												onClick={() => router.push("/diagnose/quick")}
											>
												查看诊断
											</Button>
										</div>
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
