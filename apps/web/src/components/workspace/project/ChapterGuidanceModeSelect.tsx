"use client";

import { useId } from "react";
import { chapterGuidanceModes, type ChapterGuidanceMode } from "@ai-novel-diagnosis/ai-core";

export function ChapterGuidanceModeSelect({
	value,
	disabled,
	onChange,
}: {
	value: ChapterGuidanceMode;
	disabled: boolean;
	onChange: (value: ChapterGuidanceMode) => void;
}) {
	const descriptionId = useId();
	const selected = chapterGuidanceModes[value];
	return (
		<div className="space-y-2 rounded-lg border border-border bg-muted p-3">
			<label className="grid gap-2 text-sm font-medium">
				本轮引导方式
				<select
					className="w-full min-w-0 rounded-md border border-input bg-background p-2 font-normal"
					value={value}
					disabled={disabled}
					aria-describedby={descriptionId}
					onChange={(event) => onChange(event.target.value as ChapterGuidanceMode)}
				>
					{Object.entries(chapterGuidanceModes).map(([mode, item]) => (
						<option key={mode} value={mode}>
							{item.label}
						</option>
					))}
				</select>
			</label>
			<p id={descriptionId} className="text-sm leading-6">
				{selected.description}
			</p>
			<p className="text-xs leading-5 text-muted-foreground">
				可以这样开口：{selected.example}
			</p>
			<p className="text-xs leading-5 text-muted-foreground">
				可随时切换，下次发送时生效；每轮对话会记下使用的方式。
			</p>
		</div>
	);
}
