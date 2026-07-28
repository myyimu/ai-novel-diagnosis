"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
	CheckCircle2,
	Download,
	FileJson,
	FileText,
	HeartPulse,
	Lightbulb,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { ProjectAssetTabs } from "./ProjectAssetTabs";

export function ProjectExportPage() {
	const router = useRouter();
	const [isMarkdownExporting, setIsMarkdownExporting] = useState(false);
	const [isJsonExporting, setIsJsonExporting] = useState(false);
	const {
		activeProject,
		projectRevisionSessions,
		projectMethodologyCards,
		projectStoryAuditResult,
		providerLabel,
		exportProjectMarkdown,
		exportProjectJson,
	} = useWorkspaceHandlers("overview");
	const availability = getExportAvailability({
		revisionCount: projectRevisionSessions.length,
		methodologyCount: projectMethodologyCards.length,
		hasStoryAudit: Boolean(projectStoryAuditResult),
	});

	async function exportMarkdown() {
		if (!availability.canExport) {
			toast.error("当前书籍没有可导出的内容");
			return;
		}

		setIsMarkdownExporting(true);
		try {
			await exportProjectMarkdown();
			toast.success("导出成功", { description: "书籍资产已导出为 Markdown 文件。" });
		} catch (error) {
			toast.error("导出失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		} finally {
			setIsMarkdownExporting(false);
		}
	}

	async function exportJson() {
		if (!availability.canExport) {
			toast.error("当前书籍没有可导出的内容");
			return;
		}

		setIsJsonExporting(true);
		try {
			await exportProjectJson();
			toast.success("导出成功", { description: "书籍资产已导出为 JSON 文件。" });
		} catch (error) {
			toast.error("导出失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		} finally {
			setIsJsonExporting(false);
		}
	}

	return (
		<RedesignWorkspaceShell
			active="history"
			providerLabel={providerLabel}
			crumb={
				<>
					我的书籍 / <b className="text-[#1f2329]">导出资产</b>
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
							导出资产
						</h1>
						<p className="max-w-[720px] text-sm leading-6 text-[#69707d]">
							将这本书的修改效果、故事体检摘要和方法论卡整理为可备份、分享或继续编辑的资产包。
						</p>
					</div>
					<div className="rounded-full border border-[#ffd6c4] bg-[#fff2ec] px-3 py-1 text-xs font-bold text-[#c94413] max-[720px]:mt-4 max-[720px]:inline-flex">
						{availability.assetCount} 项可导出内容
					</div>
				</section>

				<section className="mb-4 grid gap-3 md:grid-cols-5">
					<SummaryCard label="当前书籍" value={activeProject?.name || "默认书籍"} />
					<SummaryCard label="修改记录" value={`${projectRevisionSessions.length} 条`} />
					<SummaryCard label="方法论卡" value={`${projectMethodologyCards.length} 张`} />
					<SummaryCard
						label="故事体检"
						value={projectStoryAuditResult ? "已生成" : "暂无"}
					/>
					<SummaryCard label="导出格式" value="Markdown / JSON" />
				</section>

				<ProjectAssetTabs
					active="export"
					revisionCount={projectRevisionSessions.length}
					methodologyCount={projectMethodologyCards.length}
				/>

				<section className="mt-4">
					{availability.canExport ? (
						<div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
							<article className="rounded-[16px] border border-[#e6e8eb] bg-white p-5 shadow-[0_8px_24px_rgba(22,27,34,.055)]">
								<div className="flex items-start gap-3">
									<div className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-[#fff2ec] text-[#ff5a1f]">
										<Download className="size-5" />
									</div>
									<div>
										<h2 className="text-lg font-bold">本次导出内容</h2>
										<p className="mt-1 text-xs leading-5 text-[#69707d]">
											只导出书籍资产和必要的证据短引文，不包含正文全文。
										</p>
									</div>
								</div>
								<div className="mt-5 grid gap-2">
									<ExportAssetRow
										icon={<FileText className="size-4" />}
										label="修改效果"
										description="改稿指令、复诊结果、版本关系和备注"
										value={`${projectRevisionSessions.length} 条`}
									/>
									<ExportAssetRow
										icon={<Lightbulb className="size-4" />}
										label="方法论卡"
										description="可复用的改稿规则、自查问题和支持证据"
										value={`${projectMethodologyCards.length} 张`}
									/>
									<ExportAssetRow
										icon={<HeartPulse className="size-4" />}
										label="故事体检"
										description="体检摘要、关键发现和人工复核状态"
										value={projectStoryAuditResult ? "已生成" : "暂无"}
									/>
								</div>
							</article>

							<div className="grid gap-4">
								<ExportFormatCard
									icon={<FileText className="size-5" />}
									title="导出 Markdown"
									description="适合阅读、备份和继续编辑。内容按时间顺序整理。"
									buttonLabel="导出 Markdown"
									loading={isMarkdownExporting}
									disabled={isJsonExporting}
									onClick={exportMarkdown}
								/>
								<ExportFormatCard
									icon={<FileJson className="size-5" />}
									title="导出 JSON"
									description="适合归档、迁移或交给其他工具继续处理。"
									buttonLabel="导出 JSON"
									loading={isJsonExporting}
									disabled={isMarkdownExporting}
									onClick={exportJson}
									variant="outline"
								/>
							</div>
						</div>
					) : (
						<div className="rounded-[16px] border border-dashed border-[#d8dbe0] bg-white px-6 py-14 text-center shadow-[0_8px_24px_rgba(22,27,34,.055)]">
							<div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-[#fff2ec] text-[#ff5a1f]">
								<Download className="size-6" />
							</div>
							<h2 className="mt-4 text-lg font-bold">暂无可导出的书籍资产</h2>
							<p className="mx-auto mt-2 max-w-[460px] text-sm leading-6 text-[#69707d]">
								完成快速诊断、整书体检或沉淀方法论卡后，这里会自动汇总可导出的资产。
							</p>
							<Button
								onClick={() => router.push("/diagnose/quick")}
								className="mt-6 min-h-10 rounded-[9px] bg-[#ff5a1f] px-4 font-bold text-white hover:bg-[#e84b13]"
							>
								开始快速诊断
							</Button>
						</div>
					)}
				</section>

				<section className="mt-4 rounded-[14px] border border-[#d8e2f6] bg-[#edf4ff] p-4">
					<h2 className="flex items-center gap-2 text-sm font-bold text-[#2f5faa]">
						<CheckCircle2 className="size-4" />
						导出说明
					</h2>
					<ul className="mt-2 grid gap-1.5 text-xs leading-5 text-[#405a85]">
						<li>包含书籍信息、修改效果、体检摘要和方法论资产。</li>
						<li>不包含正文全文，仅保留定位和复核所需的短引文、版本元数据。</li>
						<li>Markdown 适合阅读和编辑；JSON 适合归档、迁移或二次处理。</li>
					</ul>
				</section>
			</main>
		</RedesignWorkspaceShell>
	);
}

export function getExportAvailability({
	revisionCount,
	methodologyCount,
	hasStoryAudit,
}: {
	revisionCount: number;
	methodologyCount: number;
	hasStoryAudit: boolean;
}) {
	const assetCount = revisionCount + methodologyCount + (hasStoryAudit ? 1 : 0);
	return { assetCount, canExport: assetCount > 0 };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<span className="text-[11px] text-[#69707d]">{label}</span>
			<strong className="mt-1 block truncate text-sm">{value}</strong>
		</div>
	);
}

function ExportAssetRow({
	icon,
	label,
	description,
	value,
}: {
	icon: ReactNode;
	label: string;
	description: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-[11px] border border-[#eceef1] bg-[#fafbfc] px-3 py-2.5">
			<span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#fff2ec] text-[#ff5a1f]">
				{icon}
			</span>
			<span className="min-w-0 flex-1">
				<strong className="block text-xs">{label}</strong>
				<span className="mt-0.5 block truncate text-[11px] text-[#69707d]">
					{description}
				</span>
			</span>
			<span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#505762]">
				{value}
			</span>
		</div>
	);
}

function ExportFormatCard({
	icon,
	title,
	description,
	buttonLabel,
	loading,
	disabled,
	onClick,
	variant = "primary",
}: {
	icon: ReactNode;
	title: string;
	description: string;
	buttonLabel: string;
	loading: boolean;
	disabled: boolean;
	onClick: () => void;
	variant?: "primary" | "outline";
}) {
	const isPrimary = variant === "primary";
	return (
		<article className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_6px_20px_rgba(22,27,34,.055)]">
			<div className="flex items-start gap-3">
				<span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#fff2ec] text-[#ff5a1f]">
					{icon}
				</span>
				<div>
					<h2 className="text-sm font-bold">{title}</h2>
					<p className="mt-1 text-xs leading-5 text-[#69707d]">{description}</p>
				</div>
			</div>
			<Button
				onClick={onClick}
				disabled={loading || disabled}
				variant={isPrimary ? "default" : "outline"}
				className={`mt-4 min-h-9 w-full rounded-[9px] font-bold ${
					isPrimary
						? "bg-[#ff5a1f] text-white hover:bg-[#e84b13]"
						: "border-[#d8dbe0] bg-white text-[#30353d] hover:bg-[#f6f7f9]"
				}`}
			>
				{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
				{loading ? "导出中..." : buttonLabel}
			</Button>
		</article>
	);
}
