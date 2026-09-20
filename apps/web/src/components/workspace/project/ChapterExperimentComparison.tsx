"use client";

import { useState } from "react";
import {
	chapterExperimentText,
	type ChapterExperiment,
	type ChapterReadingDecision,
} from "@ai-novel-diagnosis/ai-core";
import { Button } from "@/components/ui/button";
import {
	downloadExperimentFile,
	experimentVersionLabel,
	type ExperimentAction,
} from "@/lib/chapter-experiments";

export function ChapterExperimentComparison({
	experiment,
	busy,
	act,
	onLoad,
	currentText,
}: {
	experiment: ChapterExperiment;
	busy: boolean;
	act: (action: ExperimentAction) => Promise<boolean>;
	onLoad: (text: string) => void;
	currentText: string;
}) {
	const [first, setFirst] = useState("original");
	const [second, setSecond] = useState(experiment.versions.at(-1)?.id ?? "");
	const [pair, setPair] = useState<[string, string] | null>(null);
	const [revealed, setRevealed] = useState(false);
	const [choice, setChoice] = useState<ChapterReadingDecision["choice"]>("uncertain");
	const [reason, setReason] = useState("");
	const ids = ["original", ...experiment.versions.map((version) => version.id)];
	const canLoad =
		!currentText.trim() ||
		[experiment.originalText, ...experiment.versions.map((version) => version.text)].some(
			(text) => text.trim() === currentText.trim(),
		);

	function begin() {
		const random = crypto.getRandomValues(new Uint8Array(1))[0]!;
		setPair(random % 2 ? [first, second] : [second, first]);
		setRevealed(false);
		setReason("");
		setChoice("uncertain");
	}

	async function decide() {
		if (
			pair &&
			(await act({ action: "evaluate", leftId: pair[0], rightId: pair[1], choice, reason }))
		)
			setRevealed(true);
	}

	return (
		<section className="space-y-4 rounded-xl border border-border bg-card p-5">
			<h3 className="font-semibold">对照阅读</h3>
			<p className="text-sm text-muted-foreground">
				先隐藏来源，记录哪版更贴合目标、哪里变好或变差，再揭晓。你可能认出自己的稿子；真正的读者偏好仍需请读者独立阅读。
			</p>
			<div className="flex flex-wrap items-end gap-3">
				{[
					{ value: first, set: setFirst, label: "第一个版本" },
					{ value: second, set: setSecond, label: "第二个版本" },
				].map(({ value, set, label }) => (
					<label key={label} className="grid gap-1 text-sm">
						{label}
						<select
							className="rounded-md border border-input bg-background p-2"
							value={value}
							disabled={busy}
							onChange={(event) => {
								set(event.target.value);
								setPair(null);
							}}
						>
							<option value="" disabled>
								选择版本
							</option>
							{ids.map((id) => (
								<option key={id} value={id}>
									{experimentVersionLabel(experiment, id)}
								</option>
							))}
						</select>
					</label>
				))}
				<Button
					variant="outline"
					disabled={busy || !second || first === second}
					onClick={begin}
				>
					打乱顺序，开始阅读
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">
				比较引导效果时，优先选择两条路线的相同轮次；原稿和中间版本也可以保留为最佳版本。
			</p>
			{pair && (
				<>
					<div className="grid gap-4 xl:grid-cols-2">
						{pair.map((id, index) => (
							<article
								key={`${index}-${id}`}
								className="min-w-0 rounded-lg border border-border p-4"
							>
								<h4 className="mb-3 font-semibold">
									版本 {index ? "B" : "A"}
									{revealed ? ` · ${experimentVersionLabel(experiment, id)}` : ""}
								</h4>
								<div className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-serif text-sm leading-7">
									{chapterExperimentText(experiment, id)}
								</div>
								{revealed && (
									<div className="mt-4 flex flex-wrap gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												downloadExperimentFile(
													`${experimentVersionLabel(experiment, id)}.txt`,
													chapterExperimentText(experiment, id) ?? "",
												)
											}
										>
											下载正文
										</Button>
										<Button
											size="sm"
											disabled={busy || !canLoad}
											onClick={() =>
												onLoad(chapterExperimentText(experiment, id) ?? "")
											}
										>
											载入章节草稿
										</Button>
									</div>
								)}
							</article>
						))}
					</div>
					{!revealed ? (
						<div className="grid gap-3">
							<label className="grid gap-1 text-sm">
								阅读判断
								<select
									className="rounded-md border border-input bg-background p-2"
									value={choice}
									disabled={busy}
									onChange={(e) =>
										setChoice(
											e.target.value as ChapterReadingDecision["choice"],
										)
									}
								>
									<option value="uncertain">暂时无法判断</option>
									<option value="left">更喜欢 A</option>
									<option value="right">更喜欢 B</option>
									<option value="tie">没有明显差别</option>
								</select>
							</label>
							<label className="grid gap-1 text-sm">
								具体理由
								<textarea
									className="min-h-24 rounded-md border border-input bg-background p-3"
									value={reason}
									maxLength={2000}
									disabled={busy}
									onChange={(e) => setReason(e.target.value)}
									placeholder="哪一处更符合目标？是否失去了原来的味道，或出现新问题？"
								/>
							</label>
							<Button
								disabled={busy || reason.trim().length < 2}
								onClick={() => void decide()}
							>
								保存判断并揭晓来源
							</Button>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							判断已保存。载入草稿后仍需重新诊断；保存或选中版本不代表问题已解决。
							{!canLoad &&
								"当前章节还有未纳入本次对照的修改，请先保存或另建对照，再载入其他版本。"}
						</p>
					)}
				</>
			)}
			{experiment.decisions.length > 0 && (
				<details>
					<summary className="cursor-pointer text-sm">
						查看已保存的阅读判断（{experiment.decisions.length}）
					</summary>
					<ul className="mt-3 space-y-3 text-sm">
						{experiment.decisions.map((decision, index) => (
							<li key={index} className="rounded-md bg-muted p-3">
								{experimentVersionLabel(experiment, decision.leftId)} /{" "}
								{experimentVersionLabel(experiment, decision.rightId)}：
								{decision.choice === "tie"
									? "无明显差别"
									: decision.choice === "uncertain"
										? "无法判断"
										: `偏好${experimentVersionLabel(experiment, decision.choice === "left" ? decision.leftId : decision.rightId)}`}
								<p className="mt-1 whitespace-pre-wrap">{decision.reason}</p>
							</li>
						))}
					</ul>
				</details>
			)}
		</section>
	);
}
