"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { AlertCircle, BookOpen, CheckCircle2, Loader2, Upload } from "lucide-react";

export function ResearchBookPage() {
	const router = useRouter();

	const {
		bookFile,
		bookText,
		bookUpload,
		bookJob,
		bookAnalysisResult,
		bookStatusText,
		bookProgressDetail,
		loading,
		providerLabel,
		analyzeBook,
		setBookText,
		uploadBookForPreview,
		readBookFile,
	} = useWorkspaceHandlers("book");

	const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
		void readBookFile(event.target.files?.[0]);
	};

	const handlePreview = () => {
		void uploadBookForPreview();
	};

	const handleAnalyze = () => {
		analyzeBook();
	};

	const isJobRunning = bookJob?.status === "queued" || bookJob?.status === "running";
	const isPreviewing = loading === "upload";
	const hasInput = Boolean(bookFile || bookText.trim());
	const hasJob = Boolean(bookJob?.id);
	const hasResult = Boolean(bookAnalysisResult);

	return (
		<RedesignWorkspaceShell
			active="book"
			providerLabel={providerLabel}
			crumb={
				<>
					研究 / <b className="text-[#1f2329]">整书拆解</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton onClick={() => router.push("/project/current")}>
						书籍列表
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
			<main className="mx-auto w-[min(1040px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[780px]:w-[calc(100%_-_24px)] max-[780px]:py-[22px]">
				<section className="mb-[22px]">
					<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
						创建新书籍
					</h1>
					<p className="max-w-[720px] text-sm leading-6 text-[#6f7782]">
						上传整本 TXT 或粘贴正文。系统会先检查章节拆分，再为每章建立独立诊断页。
					</p>
				</section>

				<section className="rounded-[14px] border border-[#e4e7eb] bg-white shadow-[0_4px_16px_rgba(28,34,42,.055)]">
					<header className="flex items-start justify-between gap-4 border-b border-[#e4e7eb] px-5 py-4">
						<div>
							<h2 className="text-base font-bold">书籍正文</h2>
							<p className="mt-1 text-[11px] leading-5 text-[#6f7782]">
								书籍和正文会进入当前本地工作区。确认章节拆分后再创建小说目录。
							</p>
						</div>
						<span className="rounded-full bg-[#fff1eb] px-3 py-1 text-[10px] font-bold text-[#c74413]">
							{bookStatusText || "准备就绪"}
						</span>
					</header>

					<div className="p-5">
						<div className="mb-4 flex w-max gap-1 rounded-[11px] bg-[#f2f4f6] p-1">
							<button className="min-h-[33px] rounded-lg bg-white px-3.5 text-[11px] font-bold text-[#c74413] shadow-[0_2px_7px_rgba(20,25,32,.08)]">
								上传 TXT
							</button>
							<button className="min-h-[33px] rounded-lg px-3.5 text-[11px] font-bold text-[#6f7782]">
								粘贴正文
							</button>
						</div>

						<div className="grid gap-4 md:grid-cols-[.9fr_1.1fr]">
							<div>
								<label className="mb-1.5 block text-[11px] font-bold text-[#4d545e]">
									上传 TXT
								</label>
								<label className="grid min-h-[230px] cursor-pointer place-items-center rounded-[13px] border border-dashed border-[#ccd2d9] bg-[#fbfcfd] p-6 text-center transition hover:border-[#ff8b5f] hover:bg-[#fff1eb]">
									<input
										type="file"
										accept=".txt"
										onChange={handleFileSelect}
										className="hidden"
										disabled={isJobRunning}
									/>
									<div>
										<div className="mx-auto mb-2.5 grid size-[52px] place-items-center rounded-[15px] bg-[#fff1eb] text-[#ff5a1f]">
											<Upload className="size-6" />
										</div>
										<h3 className="text-sm font-bold">上传整本 TXT</h3>
										<p className="mb-3 mt-1 text-[10px] leading-5 text-[#6f7782]">
											也支持单章 TXT。检测到章节标题时会自动拆分。
										</p>
										<span className="inline-flex min-h-9 items-center rounded-[9px] border border-[#ff5a1f] bg-[#ff5a1f] px-3 text-sm font-bold text-white">
											选择 TXT 文件
										</span>
									</div>
								</label>
								{bookFile ? (
									<div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[#cce5d8] bg-[#eaf8f1] p-3">
										<div className="grid h-9 w-10 place-items-center rounded-[9px] bg-white text-[10px] font-bold text-[#16885b]">
											TXT
										</div>
										<div className="min-w-0 flex-1">
											<strong className="block truncate text-xs">
												{bookFile.name}
											</strong>
											<span className="block text-[10px] text-[#31755a]">
												{(bookFile.size / 1024).toFixed(1)} KB
											</span>
										</div>
									</div>
								) : null}
							</div>

							<div>
								<label className="mb-1.5 block text-[11px] font-bold text-[#4d545e]">
									或粘贴整本正文
								</label>
								<textarea
									value={bookText}
									onChange={(event) => setBookText(event.target.value)}
									placeholder="粘贴整本小说或多个章节正文……"
									className="min-h-[230px] w-full resize-y rounded-[9px] border border-[#d4d8de] bg-white px-3.5 py-3 text-sm leading-7 outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10"
									disabled={isJobRunning}
								/>
								<div className="mt-1.5 text-[10px] text-[#6f7782]">
									当前字数：{bookText.trim().length} 字
								</div>
							</div>
						</div>

						<div className="mt-4 rounded-[10px] border border-[#d8e2f6] bg-[#edf4ff] p-3 text-[10px] leading-5 text-[#405a85]">
							<strong>章节拆分检查</strong>
							<span className="ml-2">
								{bookUpload
									? `检测到 ${bookUpload.chapterCount} 个章节，将分别建立诊断页。`
									: "上传或粘贴后先检查章节拆分，避免错章影响后续分析。"}
							</span>
						</div>

						{bookUpload ? (
							<div className="mt-4 rounded-[12px] border border-[#e4e7eb] bg-white">
								<div className="border-b border-[#e4e7eb] px-4 py-3">
									<h3 className="text-sm font-bold">章节拆分预览</h3>
									<p className="mt-1 text-[11px] text-[#6f7782]">
										已识别 {bookUpload.chapterCount}{" "}
										个章节片段。确认无误后创建小说目录。
									</p>
								</div>
								<div className="max-h-72 overflow-auto text-sm">
									{bookUpload.preprocessing.chapters.map((chapter) => (
										<div
											key={chapter.id}
											className="flex items-center justify-between gap-3 border-b border-[#e4e7eb] px-4 py-2.5 last:border-b-0"
										>
											<span className="min-w-0 truncate">
												{chapter.order}. {chapter.title}
											</span>
											<span className="shrink-0 text-[10px] text-[#6f7782]">
												{chapter.charCount} 字 · {chapter.splitBy}
											</span>
										</div>
									))}
								</div>
							</div>
						) : null}

						<div className="mt-5 flex flex-col gap-3 border-t border-[#e4e7eb] pt-4 sm:flex-row sm:items-center sm:justify-between">
							<span className="text-[10px] text-[#6f7782]">
								创建后进入小说目录，并自动打开第一章诊断页。
							</span>
							<div className="flex flex-wrap justify-end gap-2">
								<Button
									variant="outline"
									onClick={handlePreview}
									disabled={isJobRunning || isPreviewing || !hasInput}
								>
									{isPreviewing ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											正在检查章节
										</>
									) : (
										"检查章节拆分"
									)}
								</Button>
								<Button
									onClick={handleAnalyze}
									disabled={isJobRunning || !hasInput}
								>
									{isJobRunning ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											正在创建书籍
										</>
									) : bookAnalysisResult ? (
										"重新分析"
									) : (
										<>
											<BookOpen className="mr-2 size-4" />
											创建书籍并开始首章诊断
										</>
									)}
								</Button>
							</div>
						</div>
					</div>
				</section>

				{hasJob ? (
					<section className="mt-4 rounded-[14px] border border-[#e4e7eb] bg-white p-5 shadow-[0_4px_16px_rgba(28,34,42,.055)]">
						<div className="flex items-center gap-3">
							{isJobRunning ? (
								<Loader2 className="size-5 animate-spin text-[#ff5a1f]" />
							) : bookJob?.status === "succeeded" ? (
								<CheckCircle2 className="size-5 text-[#16885b]" />
							) : (
								<AlertCircle className="size-5 text-[#d83b3b]" />
							)}
							<div className="min-w-0 flex-1">
								<p className="font-bold">
									{isJobRunning
										? "正在创建书籍"
										: bookJob?.status === "succeeded"
											? "小说目录已创建"
											: "任务失败"}
								</p>
								<p className="text-sm text-[#6f7782]">{bookStatusText}</p>
							</div>
						</div>
						{bookProgressDetail ? (
							<div className="mt-4 border-t border-[#e4e7eb] pt-3">
								<div className="mb-2 flex items-center justify-between text-xs">
									<span>处理进度</span>
									<span>
										{bookProgressDetail.outline.current} /{" "}
										{bookProgressDetail.outline.total} 章节
									</span>
								</div>
								<div className="h-2 rounded-full bg-[#edf0f3]">
									<div
										className="h-full rounded-full bg-[#ff5a1f]"
										style={{ width: `${bookProgressDetail.outline.percent}%` }}
									/>
								</div>
							</div>
						) : null}
					</section>
				) : null}

				{hasResult ? (
					<section className="mt-4 rounded-[14px] border border-[#ffd0bd] bg-[#fff1eb] p-5">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="size-5 text-[#ff5a1f]" />
							<h3 className="text-sm font-bold">整本分析完成</h3>
						</div>
						<p className="mt-2 text-sm leading-6 text-[#6f7782]">
							整本分析已完成，可以查看人物关系、情节模式和研究结果。
						</p>
						<div className="mt-3 flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push("/research/patterns")}
							>
								查看图谱
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push("/research/materials")}
							>
								查看资料
							</Button>
						</div>
					</section>
				) : null}
			</main>
		</RedesignWorkspaceShell>
	);
}
