import romanceSettingLoad from "../../../../fixtures/novel-diagnosis/romance-setting-load.json";
import urbanPromptTooVague from "../../../../fixtures/novel-diagnosis/urban-prompt-too-vague.json";
import xuanhuanOpeningPromise from "../../../../fixtures/novel-diagnosis/xuanhuan-ai-draft-opening-promise.json";
import type { QuickReviewInputKind, QuickReviewResult } from "@/stores/workspace-store";

interface RawDiagnosisFixture {
	id: string;
	title: string;
	genre: string;
	inputKind: string;
	chapterTitle: string;
	chapterText: string;
	previousPrompt?: string;
	expected: {
		topIssueCategory: string;
		nextAction: string;
	};
	result: unknown;
}

export interface DiagnosisExampleOption {
	id: string;
	label: string;
	description: string;
	genre: string;
	inputKind: QuickReviewInputKind;
	chapterTitle: string;
	chapterText: string;
	previousPrompt: string;
	topIssueCategory: string;
	nextAction: string;
	result?: QuickReviewResult;
}

function normalizeInputKind(value: string): QuickReviewInputKind {
	const allowed = new Set<QuickReviewInputKind>([
		"human-draft",
		"ai-draft",
		"idea",
		"outline",
		"prompt",
	]);

	return allowed.has(value as QuickReviewInputKind)
		? (value as QuickReviewInputKind)
		: "human-draft";
}

function toDiagnosisExample(fixture: RawDiagnosisFixture): DiagnosisExampleOption {
	return {
		id: fixture.id,
		label: fixture.title,
		description: fixture.expected.nextAction,
		genre: fixture.genre,
		inputKind: normalizeInputKind(fixture.inputKind),
		chapterTitle: fixture.chapterTitle,
		chapterText: fixture.chapterText,
		previousPrompt: fixture.previousPrompt ?? "",
		topIssueCategory: fixture.expected.topIssueCategory,
		nextAction: fixture.expected.nextAction,
		result: fixture.result as QuickReviewResult,
	};
}

export const diagnosisExampleOptions = [
	toDiagnosisExample(xuanhuanOpeningPromise),
	toDiagnosisExample(urbanPromptTooVague),
	toDiagnosisExample(romanceSettingLoad),
];

export function getDiagnosisExampleOption(id?: string) {
	return (
		diagnosisExampleOptions.find((example) => example.id === id) ?? diagnosisExampleOptions[0]
	);
}

export function findDiagnosisExampleByChapterText(chapterText: string) {
	const normalizedText = chapterText.trim();

	return diagnosisExampleOptions.find(
		(example) => example.result && example.chapterText.trim() === normalizedText,
	);
}
