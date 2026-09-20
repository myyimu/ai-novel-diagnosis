"use client";

import { useEffect, useRef, useState } from "react";
import {
	nextChapterRevision,
	chapterGuidanceModes,
	type ChapterGuidanceMode,
	type ChapterExperiment,
	type ChapterExperimentSummary,
} from "@ai-novel-diagnosis/ai-core";
import { Button } from "@/components/ui/button";
import type { ProviderForm } from "@/stores/workspace-types";
import {
	actOnChapterExperiment,
	createChapterExperiment,
	downloadExperimentFile,
	listChapterExperiments,
	readChapterExperiment,
	type ExperimentAction,
} from "@/lib/chapter-experiments";
import { ChapterExperimentComparison } from "./ChapterExperimentComparison";
import { ChapterGuidanceModeSelect } from "./ChapterGuidanceModeSelect";

const fieldClass =
	"min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm leading-6";

export function ChapterExperimentPanel({
	projectId,
	chapterTitle,
	chapterText,
	initialContext,
	initialDiagnosis,
	provider,
	onLoad,
}: {
	projectId: string;
	chapterTitle: string;
	chapterText: string;
	initialContext: string;
	initialDiagnosis: string;
	provider: ProviderForm;
	onLoad: (text: string, goal: string, preserve: string) => void;
}) {
	const [experiment, setExperiment] = useState<ChapterExperiment | null>(null);
	const [history, setHistory] = useState<ChapterExperimentSummary[]>([]);
	const [goal, setGoal] = useState("");
	const [sourceText, setSourceText] = useState(chapterText);
	const [preserve, setPreserve] = useState("");
	const [context, setContext] = useState(initialContext);
	const [useDiagnosis, setUseDiagnosis] = useState(true);
	const [message, setMessage] = useState("");
	const [mode, setMode] = useState<ChapterGuidanceMode>("auto");
	const [plan, setPlan] = useState("");
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const lock = useRef(false);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		let cancelled = false;
		void listChapterExperiments(projectId)
			.then(async (all) => {
				const matching = all.filter((item) => item.chapterTitle === chapterTitle);
				const latest = matching[0] ? await readChapterExperiment(matching[0].id) : null;
				if (!cancelled) {
					setHistory(matching);
					setExperiment(latest);
					setMode(latest?.turns.at(-1)?.mode ?? "auto");
					setPlan(latest?.plan ?? latest?.turns.at(-1)?.suggestedPlan ?? "");
				}
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					setError(reason instanceof Error ? reason.message : "读取历史失败，请重试。");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
			mounted.current = false;
		};
	}, [projectId, chapterTitle]);

	async function run(task: () => Promise<ChapterExperiment>): Promise<boolean> {
		if (lock.current) return false;
		lock.current = true;
		setBusy(true);
		setError(null);
		try {
			const saved = await task();
			if (mounted.current) {
				setExperiment(saved);
				setMode(saved.turns.at(-1)?.mode ?? "auto");
				setPlan(saved.plan ?? saved.turns.at(-1)?.suggestedPlan ?? "");
				setHistory((items) => [
					{
						id: saved.id,
						chapterTitle: saved.chapterTitle,
						goal: saved.goal,
						createdAt: saved.createdAt,
					},
					...items.filter((item) => item.id !== saved.id),
				]);
			}
			return true;
		} catch (reason) {
			if (mounted.current)
				setError(
					reason instanceof Error ? reason.message : "操作失败，已保存的记录仍然保留。",
				);
			return false;
		} finally {
			lock.current = false;
			if (mounted.current) setBusy(false);
		}
	}

	async function act(action: ExperimentAction): Promise<boolean> {
		return experiment ? run(() => actOnChapterExperiment(experiment, action, provider)) : false;
	}

	return (
		<section
			className="space-y-5 rounded-xl border border-border bg-background p-4 sm:p-6"
			aria-label="章节引导与对照"
		>
			<header className="space-y-2">
				<h2 className="text-lg font-semibold">章节引导与对照</h2>
				<p className="text-sm leading-6 text-muted-foreground">
					围绕真实章节想清楚一件事，再比较普通改稿与引导改稿。原稿、对话、各轮正文和你的判断都会保存。
				</p>
				<div className="flex flex-wrap gap-2">
					<label className="flex min-w-0 items-center gap-2 text-sm">
						历史对照
						<select
							className="max-w-64 rounded-md border border-input bg-card p-2"
							value={experiment?.id ?? ""}
							disabled={busy || loading}
							onChange={(e) => {
								if (e.target.value) {
									setMessage("");
									void run(() => readChapterExperiment(e.target.value));
								}
							}}
						>
							<option value="">选择已保存记录</option>
							{history.map((item) => (
								<option key={item.id} value={item.id}>
									{new Date(item.createdAt).toLocaleDateString()} · {item.goal}
								</option>
							))}
						</select>
					</label>
					<Button
						variant="outline"
						disabled={busy || loading}
						onClick={() => {
							setExperiment(null);
							setMode("auto");
							setSourceText(chapterText);
							setMessage("");
							setPlan("");
							setError(null);
						}}
					>
						用当前正文新建
					</Button>
					{experiment && (
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => void run(() => readChapterExperiment(experiment.id))}
						>
							重新载入
						</Button>
					)}
				</div>
			</header>
			{(busy || loading) && (
				<p role="status" className="text-sm text-muted-foreground">
					{loading
						? "正在读取历史…"
						: "正在处理，请稍候。生成完成后会保存；离开页面可稍后回来查看。"}
				</p>
			)}
			{error && (
				<p
					role="alert"
					className="rounded-md border border-destructive p-3 text-sm text-destructive"
				>
					{error}
				</p>
			)}
			{provider.kind === "mock" && (
				<p className="text-sm text-muted-foreground">
					当前为演示模型。可以保存原稿和目标；引导及改稿需要在 AI 设置中选择真实模型。
				</p>
			)}
			{!experiment && !loading && (
				<div className="space-y-4">
					<p className="text-sm">
						当前章节：{chapterTitle} · {sourceText.length} 字（本次支持 50–12,000 字）。
					</p>
					<label className="grid gap-2 text-sm">
						本次原稿
						<textarea
							className={fieldClass}
							value={sourceText}
							maxLength={12000}
							disabled={busy}
							onChange={(event) => setSourceText(event.target.value)}
							placeholder="使用当前章节，或直接粘贴一份你想验证的真实稿件。"
						/>
					</label>
					<label className="grid gap-2 text-sm">
						这次希望改善什么？
						<textarea
							className={fieldClass}
							value={goal}
							maxLength={1000}
							disabled={busy}
							onChange={(e) => setGoal(e.target.value)}
							placeholder="例如：让读者好奇父亲隐藏的过去，同时保持平静的日常氛围。"
						/>
					</label>
					<label className="grid gap-2 text-sm">
						哪些内容和特点要保留？
						<textarea
							className={fieldClass}
							value={preserve}
							maxLength={1000}
							disabled={busy}
							onChange={(e) => setPreserve(e.target.value)}
							placeholder="例如：父子关系、慢节奏、不增加反派、不提前揭底。"
						/>
					</label>
					<label className="grid gap-2 text-sm">
						必要的小说设定与前情
						<textarea
							className={fieldClass}
							value={context}
							maxLength={6000}
							disabled={busy}
							onChange={(e) => setContext(e.target.value)}
							placeholder="两条改稿路线都会获得相同的设定与前情，可留空。"
						/>
					</label>
					{initialDiagnosis && sourceText === chapterText && (
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={useDiagnosis}
								disabled={busy}
								onChange={(event) => setUseDiagnosis(event.target.checked)}
							/>
							引导时参考本章现有诊断，允许质疑或撤回
						</label>
					)}
					<Button
						disabled={
							busy ||
							sourceText.trim().length < 50 ||
							sourceText.length > 12000 ||
							goal.trim().length < 2 ||
							!preserve.trim()
						}
						onClick={() =>
							void run(() =>
								createChapterExperiment({
									projectId,
									chapterTitle,
									originalText: sourceText,
									goal,
									preserve,
									context,
									...(useDiagnosis &&
									initialDiagnosis &&
									sourceText === chapterText
										? { diagnosis: initialDiagnosis }
										: {}),
								}),
							)
						}
					>
						保存原稿与目标，开始引导
					</Button>
				</div>
			)}
			{experiment && (
				<>
					<div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
						<p>
							<strong>目标：</strong>
							{experiment.goal}
						</p>
						<p>
							<strong>保留：</strong>
							{experiment.preserve}
						</p>
						<details>
							<summary className="cursor-pointer">查看固定的原稿与设定</summary>
							<p className="mt-3 whitespace-pre-wrap">
								{experiment.context || "未补充设定"}
							</p>
							<pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-serif leading-7">
								{experiment.originalText}
							</pre>
						</details>
						{chapterText !== experiment.originalText && (
							<p className="text-muted-foreground">
								当前章节与本次原稿不同。本次始终以保存的原稿开始；要比较当前正文，请新建对照。
							</p>
						)}
					</div>
					<section className="space-y-4" aria-label="围绕章节的引导对话">
						<h3 className="font-semibold">先把修改想清楚</h3>
						<p className="text-sm text-muted-foreground">
							可以请它提问、给出少量方案，或质疑它的判断。无需同意
							AI，也无需把故事改成固定套路。
						</p>
						{experiment.turns.map((turn, index) => (
							<div
								key={index}
								className="space-y-3 rounded-lg border border-border p-4 text-sm leading-6"
							>
								<p className="text-xs font-medium text-muted-foreground">
									第 {index + 1} 轮 ·{" "}
									{chapterGuidanceModes[turn.mode ?? "auto"].label}
								</p>
								<p className="whitespace-pre-wrap">
									<strong>你：</strong>
									{turn.message}
								</p>
								<p className="whitespace-pre-wrap">
									<strong>引导：</strong>
									{turn.reply}
								</p>
								{turn.quote && (
									<blockquote className="border-l-2 border-primary pl-3 text-muted-foreground">
										原文：{turn.quote}
									</blockquote>
								)}
							</div>
						))}
						{!experiment.plan && (
							<>
								<ChapterGuidanceModeSelect
									value={mode}
									onChange={setMode}
									disabled={busy || experiment.turns.length >= 6}
								/>
								<label className="grid gap-2 text-sm">
									你的想法或问题
									<textarea
										className={fieldClass}
										value={message}
										maxLength={2000}
										disabled={busy}
										onChange={(e) => setMessage(e.target.value)}
										placeholder={chapterGuidanceModes[mode].example}
									/>
								</label>
								<Button
									disabled={
										busy ||
										provider.kind === "mock" ||
										!message.trim() ||
										experiment.turns.length >= 6
									}
									onClick={() =>
										void act({ action: "ask", message, mode }).then((ok) => {
											if (ok) setMessage("");
										})
									}
								>
									发送（{experiment.turns.length}/6）
								</Button>
								{experiment.turns.length > 0 && (
									<div className="grid gap-3 rounded-lg border border-border p-4">
										<label className="grid gap-2 text-sm">
											确认本轮修改计划
											<textarea
												className={fieldClass}
												value={plan}
												maxLength={2000}
												disabled={busy}
												onChange={(e) => setPlan(e.target.value)}
											/>
										</label>
										<p className="text-xs text-muted-foreground">
											{!plan.trim() &&
												"目前还没有具体方案，可以继续交流或自行填写。"}
											请改成你真正同意的方案。确认后固定，用于引导改稿；普通改稿只使用开始时的目标、保留项和设定。
										</p>
										<Button
											disabled={busy || plan.trim().length < 2}
											onClick={() =>
												void act({ action: "confirm-plan", plan })
											}
										>
											确认计划，进入改稿对照
										</Button>
									</div>
								)}
							</>
						)}
					</section>
					{experiment.plan && (
						<section className="space-y-4">
							<p className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
								<strong>已确认计划：</strong>
								{experiment.plan}
							</p>
							<div className="grid gap-4 sm:grid-cols-2">
								{(["baseline", "guided"] as const).map((route) => {
									const versions = experiment.versions.filter(
										(version) => version.route === route,
									);
									const next = nextChapterRevision(experiment, route);
									return (
										<article
											key={route}
											className="space-y-3 rounded-lg border border-border bg-card p-4"
										>
											<h3 className="font-semibold">
												{route === "baseline" ? "普通改稿" : "引导改稿"}
											</h3>
											<p className="text-sm text-muted-foreground">
												{route === "baseline"
													? "直接按相同创作目标改稿。"
													: "在相同目标上加入你确认的修改计划。"}
												最多两轮，可随时停止。
											</p>
											{versions.map((version) => (
												<details key={version.id} className="text-sm">
													<summary className="cursor-pointer">
														第 {version.round} 轮 ·{" "}
														{version.text.length} 字 ·{" "}
														{(version.elapsedMs / 1000).toFixed(1)} 秒
													</summary>
													<p className="my-2 text-xs text-muted-foreground">
														{version.modelLabel}
													</p>
													<p className="max-h-72 overflow-auto whitespace-pre-wrap font-serif leading-7">
														{version.text}
													</p>
												</details>
											))}
											<Button
												disabled={busy || provider.kind === "mock" || !next}
												onClick={() =>
													void act({ action: "generate", route })
												}
											>
												{next ? `生成第 ${next.round} 轮` : "已完成两轮"}
											</Button>
										</article>
									);
								})}
							</div>
							<p className="text-xs text-muted-foreground">
								生成会调用当前模型并产生用量。两条路线固定相同的模型设置；自动线路可能更换实际模型。引导模型耗时{" "}
								{Math.round(
									experiment.turns.reduce(
										(sum, turn) => sum + turn.elapsedMs,
										0,
									) / 1000,
								)}{" "}
								秒。用量明细可在 AI 设置查看。
							</p>
						</section>
					)}
					{experiment.versions.length > 0 && (
						<ChapterExperimentComparison
							key={experiment.id}
							experiment={experiment}
							busy={busy}
							act={act}
							currentText={chapterText}
							onLoad={(text) => onLoad(text, experiment.goal, experiment.preserve)}
						/>
					)}
					<Button
						variant="outline"
						disabled={busy}
						onClick={() =>
							downloadExperimentFile(
								"章节改稿对照.json",
								JSON.stringify(experiment, null, 2),
								"application/json",
							)
						}
					>
						导出原稿、对话、全部版本与判断
					</Button>
				</>
			)}
		</section>
	);
}
