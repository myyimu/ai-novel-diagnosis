import type {
	ChapterExperiment,
	ChapterExperimentBrief,
	ChapterExperimentSummary,
	ChapterReadingDecision,
	ChapterRevisionRoute,
} from "@ai-novel-diagnosis/ai-core";
import type { ProviderForm } from "@/stores/workspace-types";
import { getJson, postJson } from "./api-client";

const path = "/analysis/chapter-experiments";
export const listChapterExperiments = (projectId: string) =>
	getJson<ChapterExperimentSummary[]>(`${path}?projectId=${encodeURIComponent(projectId)}`);
export const readChapterExperiment = (id: string) =>
	getJson<ChapterExperiment>(`${path}/${encodeURIComponent(id)}`);
export const createChapterExperiment = (brief: ChapterExperimentBrief & { projectId: string }) =>
	postJson<ChapterExperiment>(path, brief);

export type ExperimentAction =
	| { action: "ask"; message: string }
	| { action: "confirm-plan"; plan: string }
	| { action: "generate"; route: ChapterRevisionRoute }
	| ({ action: "evaluate" } & Omit<ChapterReadingDecision, "createdAt">);

export function actOnChapterExperiment(
	experiment: ChapterExperiment,
	action: ExperimentAction,
	provider: ProviderForm,
) {
	return postJson<ChapterExperiment>(`${path}/${encodeURIComponent(experiment.id)}/actions`, {
		...action,
		revision: experiment.revision,
		...(["ask", "generate"].includes(action.action) ? { provider } : {}),
	});
}

export function experimentVersionLabel(experiment: ChapterExperiment, id: string): string {
	if (id === "original") return "原稿 V0";
	const version = experiment.versions.find((item) => item.id === id);
	return version
		? `${version.route === "baseline" ? "普通改稿" : "引导改稿"} · 第 ${version.round} 轮`
		: "未知版本";
}

export function downloadExperimentFile(
	filename: string,
	text: string,
	type = "text/plain;charset=utf-8",
) {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
