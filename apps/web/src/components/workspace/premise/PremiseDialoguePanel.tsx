"use client";

import { useEffect, useRef, useState } from "react";

import {
	PREMISE_DIALOGUE_MAX_ROUNDS,
	PREMISE_LAYER_META,
	type PremiseAuthorContract,
	type PremiseDialogueContractReviewOutput,
	type PremiseDialogueTurnRecord,
	type PremiseReviewResult,
} from "@ai-novel-diagnosis/ai-core";
import { Button } from "@/components/ui/button";
import {
	answerPremiseDialogue,
	advancePremiseDialogue,
	finishPremiseDialogue,
	type PremiseDialogueContractForm,
	type PremiseDialogueSessionPayload,
	retryPremiseDialogueJudge,
	startPremiseDialogue,
	submitPremiseDialogueContract,
} from "@/lib/workspace-analysis-client";
import type { ProviderForm } from "@/stores/workspace-store";
import { CheckCircle2, Loader2, MessageCircle, PenLine, Send, TriangleAlert } from "lucide-react";

/**
 * 立项引导对话面板（T3）：审稿之后的多轮师徒问答。
 * 四条红线在 UI 侧的落点——教师只提问（问题卡不提供答案草稿）、
 * 过程由服务端编排（轮次硬上限展示为 x/3）、分歧不静默
 * （disagreementNote 高亮）、判定必锚定（quoteAuthor 显示为作者原话；
 * 未锚定的评判显示"已被服务端拒绝"而不是悄悄降级）。
 *
 * 契约六字段表单刻意留空：编辑的重述只做对照，作者亲笔才算契约。
 */
export function PremiseDialoguePanel({
	provider,
	projectId,
	premiseText,
	genre,
	review,
	onAdoptContract,
}: {
	provider: ProviderForm;
	projectId: string;
	premiseText: string;
	genre?: string;
	review: PremiseReviewResult;
	/** 提交契约后把作者亲笔带回页面上方的发动机卡编辑区。 */
	onAdoptContract?: (contract: PremiseDialogueContractForm) => void;
}) {
	const [session, setSession] = useState<PremiseDialogueSessionPayload | null>(null);
	const [busy, setBusy] = useState<
		"start" | "answer" | "judge" | "next" | "finish" | "contract" | null
	>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [answerDraft, setAnswerDraft] = useState("");
	const [requestReview, setRequestReview] = useState(true);
	const [contractDraft, setContractDraft] = useState<PremiseDialogueContractForm>({
		premiseSummary: "",
		coreConflict: "",
		protagonistDesire: "",
		opposingForce: "",
		irreducibilityTest: "",
		readerHookQuestion: "",
	});

	/* 新一轮审稿（reviewId 变化）意味着旧对话锚定的对象已过时——整体重置。 */
	const reviewIdRef = useRef(review.reviewId);
	useEffect(() => {
		if (reviewIdRef.current === review.reviewId) {
			return;
		}
		reviewIdRef.current = review.reviewId;
		setSession(null);
		setError(null);
		setNotice(null);
		setAnswerDraft("");
		setContractDraft({
			premiseSummary: "",
			coreConflict: "",
			protagonistDesire: "",
			opposingForce: "",
			irreducibilityTest: "",
			readerHookQuestion: "",
		});
	}, [review.reviewId]);

	const run = async <T,>(
		phase: NonNullable<typeof busy>,
		action: () => Promise<T>,
	): Promise<T | null> => {
		setBusy(phase);
		setError(null);
		try {
			return await action();
		} catch (actionError) {
			setError(actionError instanceof Error ? actionError.message : "请求失败，请稍后重试。");
			return null;
		} finally {
			setBusy(null);
		}
	};

	const start = () => {
		void run("start", () =>
			startPremiseDialogue({ provider, projectId, premiseText, genre, review }),
		).then((next) => {
			if (next) {
				setSession(next);
			}
		});
	};

	const submitAnswer = () => {
		if (!session || answerDraft.trim().length === 0) {
			return;
		}
		const draft = answerDraft;
		void run("answer", () =>
			answerPremiseDialogue({ sessionId: session.id, provider, answer: draft }),
		).then((next) => {
			if (next) {
				setSession(next);
				setAnswerDraft("");
			}
		});
	};

	const retryJudge = () => {
		if (!session) {
			return;
		}
		void run("judge", () =>
			retryPremiseDialogueJudge({ sessionId: session.id, provider }),
		).then((next) => {
			if (next) {
				setSession(next);
			}
		});
	};

	const nextRound = () => {
		if (!session) {
			return;
		}
		void run("next", () => advancePremiseDialogue({ sessionId: session.id, provider })).then(
			(next) => {
				if (next) {
					setSession(next);
				}
			},
		);
	};

	const finishEarly = () => {
		if (!session) {
			return;
		}
		void run("finish", () => finishPremiseDialogue(session.id)).then((next) => {
			if (next) {
				setSession(next);
			}
		});
	};

	const submitContract = (withReview: boolean) => {
		if (!session) {
			return;
		}
		void run("contract", () =>
			submitPremiseDialogueContract({
				sessionId: session.id,
				provider,
				contract: contractDraft,
				requestReview: withReview,
			}),
		).then((result) => {
			if (result) {
				setSession(result.record);
				setNotice(result.contractReviewNotice ?? null);
				onAdoptContract?.(contractDraft);
			}
		});
	};

	const state = session?.session;
	const turns = state?.turns ?? [];
	const currentTurn: PremiseDialogueTurnRecord | undefined = turns[turns.length - 1];
	const pendingAnswer = Boolean(
		state?.status === "active" && currentTurn && currentTurn.authorAnswer === undefined,
	);
	const turnResolved = Boolean(
		currentTurn &&
		currentTurn.authorAnswer !== undefined &&
		(currentTurn.judge || currentTurn.judgeRejected),
	);

	return (
		<section className="mt-[22px] overflow-hidden rounded-[14px] border border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
			<header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e8eb] bg-[#fcfcfd] px-5 py-[18px] pb-3.5">
				<div>
					<h2 className="m-0 flex items-center gap-2 text-base font-bold leading-snug">
						<MessageCircle className="size-[18px] text-[#ff5a1f]" />
						立项引导对话
					</h2>
					<p className="mt-1 text-xs text-[#69707d]">
						编辑只提问、不代写；判定必须引用你的原话，找不到原话的不算数。
						对话以你亲笔的契约六字段收束。
					</p>
				</div>
				{state && state.status === "active" ? (
					<span className="rounded-full bg-[#fff2ec] px-[10px] py-1 text-[11px] font-bold text-[#c94413]">
						已进行 {Math.min(turns.length, PREMISE_DIALOGUE_MAX_ROUNDS)} /{" "}
						{PREMISE_DIALOGUE_MAX_ROUNDS} 轮
					</span>
				) : null}
			</header>

			<div className="p-5">
				{error ? (
					<div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#f0c3c2] bg-[#fff0f0] px-3.5 py-2.5 text-xs leading-5 text-[#a82f2d]">
						<TriangleAlert className="mt-0.5 size-4 shrink-0" />
						{error}
					</div>
				) : null}
				{notice ? (
					<div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-2.5 text-xs leading-5 text-[#7f4a0c]">
						<TriangleAlert className="mt-0.5 size-4 shrink-0" />
						{notice}
					</div>
				) : null}

				{!session ? <DialogueIntro onStart={start} isStarting={busy === "start"} /> : null}

				{session ? (
					<div className="grid gap-3.5">
						{turns.map((turn) => (
							<DialogueTurnView key={`${turn.round}-${turn.layer}`} turn={turn} />
						))}

						{pendingAnswer && currentTurn ? (
							<div className="rounded-[12px] border border-[#ffd6c2] bg-[#fff8f4] p-4">
								<label className="grid gap-[7px]">
									<span className="text-xs font-bold text-[#7a381c]">
										你的回答
									</span>
									<textarea
										value={answerDraft}
										onChange={(event) => setAnswerDraft(event.target.value)}
										placeholder="用你自己故事里的具体人物和场景回答——判定只认你的原话。"
										className="min-h-[110px] w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3.5 py-[11px] text-sm leading-7 outline-none focus:border-[#ff8b5f]"
									/>
								</label>
								<div className="mt-3 flex items-center justify-between gap-3">
									<span className="text-[11px] leading-5 text-[#955208]">
										回答会先保存，再由编辑判定；判定失败可重试，不会丢回答。
									</span>
									<Button
										onClick={submitAnswer}
										disabled={busy !== null || answerDraft.trim().length === 0}
										className="min-h-10 rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
									>
										{busy === "answer" ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Send className="mr-2 size-4" />
										)}
										提交回答
									</Button>
								</div>
							</div>
						) : null}

						{state?.status === "active" && turnResolved ? (
							<div className="flex flex-wrap items-center gap-2.5">
								<Button
									onClick={nextRound}
									disabled={busy !== null}
									className="min-h-10 rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
								>
									{busy === "next" ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									下一轮
								</Button>
								<Button
									variant="outline"
									onClick={finishEarly}
									disabled={busy !== null}
									className="min-h-10 rounded-[9px] border-[#d8dbe0]"
								>
									{busy === "finish" ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									提前收束，直接写契约
								</Button>
							</div>
						) : null}

						{state?.status === "active" &&
						currentTurn?.judgeRejected?.reason === "model-failed" ? (
							<div className="flex flex-wrap items-center gap-2.5">
								<Button
									variant="outline"
									onClick={retryJudge}
									disabled={busy !== null}
									className="min-h-10 rounded-[9px] border-[#d8dbe0]"
								>
									{busy === "judge" ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									重新评判
								</Button>
								<span className="text-[11px] leading-5 text-[#69707d]">
									仅本轮判定生成失败时可重试；你的回答已保存。
								</span>
							</div>
						) : null}

						{state && state.status !== "active" ? (
							<ContractSection
								session={session}
								contractDraft={contractDraft}
								onContractDraftChange={setContractDraft}
								requestReview={requestReview}
								onRequestReviewChange={setRequestReview}
								isSubmitting={busy === "contract"}
								onSubmit={submitContract}
							/>
						) : null}
					</div>
				) : null}
			</div>
		</section>
	);
}

function DialogueIntro({ onStart, isStarting }: { onStart: () => void; isStarting: boolean }) {
	return (
		<div className="grid gap-3.5">
			<div className="grid gap-2 rounded-[12px] border border-[#eceef1] bg-[#f7f8fa] px-4 py-3 text-xs leading-5 text-[#545b66]">
				<p className="m-0">
					审稿结论只是编辑的判断；这场对话把它变成<strong>你自己的答案</strong>
					——最多三轮，每轮编辑针对最薄弱的一层提一个问题，你用自己的话回答。
				</p>
				<p className="m-0">
					结束后你亲手写下契约六字段（故事概述 + 五条承诺）。编辑的重述只做对照，
					亲笔才算契约。
				</p>
			</div>
			<div>
				<Button
					onClick={onStart}
					disabled={isStarting}
					className="min-h-11 min-w-[168px] rounded-[9px] bg-[#ff5a1f] font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.18)] hover:bg-[#e84b13]"
				>
					{isStarting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
					开始引导对话
				</Button>
			</div>
		</div>
	);
}

/** 单轮对话的只读展示（导出供静态渲染测试）。 */
export function DialogueTurnView({ turn }: { turn: PremiseDialogueTurnRecord }) {
	const meta = PREMISE_LAYER_META[turn.layer];
	const judge = turn.judge;
	const rejected = turn.judgeRejected;

	return (
		<article className="rounded-[12px] border border-[#e6e8eb]">
			<header className="flex items-center justify-between gap-3 border-b border-[#eceef1] bg-[#fcfcfd] px-4 py-2.5">
				<span className="text-xs font-bold text-[#4d535d]">
					第 {turn.round} 轮 · {meta.label}
				</span>
				<span className="text-[11px] text-[#9aa1ab]">{meta.question}</span>
			</header>
			<div className="grid gap-3 p-4">
				<div className="grid gap-1.5">
					<p className="m-0 text-[15px] font-bold leading-7 text-[#1f2329]">
						{turn.ask.question}
					</p>
					{turn.ask.whyThisQuestion ? (
						<p className="m-0 text-xs leading-5 text-[#69707d]">
							为什么问这个：{turn.ask.whyThisQuestion}
						</p>
					) : null}
					{turn.ask.hintQuoteStatus === "anchored" && turn.ask.hintQuote ? (
						<blockquote className="m-0 rounded-[10px] border border-[#eceef1] bg-[#f7f8fa] px-3 py-2 text-xs leading-5 text-[#464d57]">
							你的灵感原文：“{turn.ask.hintQuote}”
						</blockquote>
					) : null}
				</div>

				{turn.authorAnswer !== undefined ? (
					<div className="rounded-[10px] border border-[#e6e8eb] bg-white px-3.5 py-2.5 text-sm leading-7 text-[#303640]">
						<b className="mb-1 block text-xs text-[#69707d]">你的回答</b>
						{turn.authorAnswer}
					</div>
				) : null}

				{judge ? <DialogueJudgeView judge={judge} /> : null}
				{rejected ? (
					rejected.reason === "model-failed" ? (
						<div className="rounded-[10px] border border-[#f0c3c2] bg-[#fff0f0] px-3.5 py-2.5 text-xs leading-5 text-[#a82f2d]">
							编辑判定未能生成（模型或解析失败）；你的回答已保存，可用下方"重新评判"重试。
						</div>
					) : (
						<div className="rounded-[10px] border border-[#f5d9a8] bg-[#fff7e6] px-3.5 py-2.5 text-xs leading-5 text-[#7f4a0c]">
							这条判定没能锚定你的原话，已被服务端拒绝（不算数）。可继续下一轮。
						</div>
					)
				) : null}
			</div>
		</article>
	);
}

const verdictMeta: Record<string, { label: string; chipClass: string }> = {
	strengthened: { label: "成立", chipClass: "bg-[#e6f6ec] text-[#1f6b3a]" },
	"not-yet": { label: "还不够", chipClass: "bg-[#fff7e6] text-[#955208]" },
	weakened: { label: "反而更弱", chipClass: "bg-[#fff0f0] text-[#a82f2d]" },
};

export function DialogueJudgeView({
	judge,
}: {
	judge: NonNullable<PremiseDialogueTurnRecord["judge"]>;
}) {
	const meta = verdictMeta[judge.verdict] ?? verdictMeta["not-yet"];
	return (
		<div className="grid gap-2 rounded-[10px] border border-[#d8e2f6] bg-[#f4f8ff] px-3.5 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<span
					className={`rounded-full px-[9px] py-1 text-[11px] font-bold ${meta.chipClass}`}
				>
					编辑判定：{meta.label}
				</span>
				{judge.layerStatusSuggestion ? (
					<span className="text-[11px] text-[#405a85]">
						建议层状态：{judge.layerStatusSuggestion}
					</span>
				) : null}
			</div>
			<blockquote className="m-0 rounded-[8px] border border-[#c9dbf8] bg-white px-3 py-2 text-[13px] leading-6 text-[#2f5faa]">
				<b className="mb-0.5 block text-[11px]">锚定的你的原话</b>“{judge.quoteAuthor}”
			</blockquote>
			{judge.reason ? (
				<p className="m-0 text-[13px] leading-6 text-[#405a85]">{judge.reason}</p>
			) : null}
			{judge.disagreementNote ? (
				<div className="rounded-[8px] border border-[#f5d9a8] bg-[#fff7e6] px-3 py-2 text-xs leading-5 text-[#7f4a0c]">
					<b className="mb-0.5 block">与审稿结论的分歧（如实记录）</b>
					{judge.disagreementNote}
				</div>
			) : null}
			{judge.followUp ? (
				<p className="m-0 text-xs leading-5 text-[#69707d]">
					如果继续追问，编辑会问：{judge.followUp}
				</p>
			) : null}
		</div>
	);
}

const contractFormFields: Array<{
	key: keyof PremiseDialogueContractForm;
	label: string;
	hint: string;
}> = [
	{
		key: "premiseSummary",
		label: "故事概述",
		hint: "一句话说清这个故事承诺了什么（至少 2 字）",
	},
	{
		key: "coreConflict",
		label: "核心冲突",
		hint: "欲望与阻力在哪里对撞？",
	},
	{ key: "protagonistDesire", label: "主角欲望", hint: "主角具体想要什么？" },
	{ key: "opposingForce", label: "对立阻力", hint: "谁在持续阻止她/他？" },
	{
		key: "irreducibilityTest",
		label: "不可替代性测试",
		hint: "换掉全部设定后故事仍成立吗？为什么非这样不可？",
	},
	{
		key: "readerHookQuestion",
		label: "读者钩子问题",
		hint: "读者带着哪个问题往下读？",
	},
];

function ContractSection({
	session,
	contractDraft,
	onContractDraftChange,
	requestReview,
	onRequestReviewChange,
	isSubmitting,
	onSubmit,
}: {
	session: PremiseDialogueSessionPayload;
	contractDraft: PremiseDialogueContractForm;
	onContractDraftChange: (draft: PremiseDialogueContractForm) => void;
	requestReview: boolean;
	onRequestReviewChange: (value: boolean) => void;
	isSubmitting: boolean;
	onSubmit: (withReview: boolean) => void;
}) {
	const state = session.session;
	const completed = state.status === "completed";
	const review = state.contractReview;
	const canSubmit =
		contractDraft.premiseSummary.trim().length >= 2 && contractFieldsFilled(contractDraft);

	return (
		<div className="grid gap-3.5">
			<div className="rounded-[10px] border border-[#eceef1] bg-[#f7f8fa] px-3.5 py-2.5 text-xs leading-5 text-[#545b66]">
				{state.status === "collecting"
					? "对话已收束。现在由你亲笔写下契约六字段——表单刻意留空，编辑的重述不代写。"
					: "契约已提交。可改写后重新提交；上次点评失败时重新提交会再请求点评。"}
			</div>

			{completed && state.authorContract ? (
				<AuthorContractCard contract={state.authorContract} />
			) : null}

			{completed && review ? <ContractReviewView review={review} /> : null}

			<div className="grid gap-2.5">
				{contractFormFields.map((field) => (
					<label key={field.key} className="grid gap-[6px]">
						<span className="text-xs font-bold text-[#4d535d]">{field.label}</span>
						<textarea
							value={contractDraft[field.key]}
							onChange={(event) =>
								onContractDraftChange({
									...contractDraft,
									[field.key]: event.target.value,
								})
							}
							placeholder={field.hint}
							className="min-h-[56px] w-full resize-y rounded-[10px] border border-[#d8dbe0] bg-white px-3 py-2 text-[13px] leading-6 outline-none focus:border-[#ff8b5f]"
						/>
					</label>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<label className="flex items-center gap-2 text-xs text-[#545b66]">
					<input
						type="checkbox"
						checked={requestReview}
						onChange={(event) => onRequestReviewChange(event.target.checked)}
						className="size-4 accent-[#ff5a1f]"
					/>
					提交后请求费曼点评（一次额外模型调用）
				</label>
				<Button
					onClick={() => onSubmit(requestReview)}
					disabled={isSubmitting || !canSubmit}
					className="min-h-10 rounded-[9px] bg-[#ff5a1f] font-bold text-white hover:bg-[#e84b13]"
				>
					{isSubmitting ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : (
						<PenLine className="mr-2 size-4" />
					)}
					{completed ? "重新提交契约" : "提交契约"}
				</Button>
			</div>
		</div>
	);
}

function contractFieldsFilled(contract: PremiseDialogueContractForm): boolean {
	return (
		contract.coreConflict.trim().length >= 2 &&
		contract.protagonistDesire.trim().length >= 2 &&
		contract.opposingForce.trim().length >= 2 &&
		contract.irreducibilityTest.trim().length >= 2 &&
		contract.readerHookQuestion.trim().length >= 2
	);
}

function AuthorContractCard({ contract }: { contract: PremiseAuthorContract }) {
	return (
		<div className="grid gap-2 rounded-[10px] border border-[#bfe3c8] bg-[#f0faf3] px-3.5 py-3">
			<div className="flex items-center gap-2 text-xs font-bold text-[#1f6b3a]">
				<CheckCircle2 className="size-4" />
				你亲笔的契约（已提交）
			</div>
			<dl className="m-0 grid gap-1 text-[13px] leading-6 text-[#2c5c3d]">
				<div>
					<dt className="mr-1 inline text-[11px] text-[#4a7c5c]">故事概述</dt>
					<dd className="m-0 inline">{contract.premiseSummary}</dd>
				</div>
				{contractFormFields.slice(1).map((field) => (
					<div key={field.key}>
						<dt className="mr-1 inline text-[11px] text-[#4a7c5c]">{field.label}</dt>
						<dd className="m-0 inline">
							{contract[field.key as keyof PremiseDialogueContractForm]}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

const feynmanVerdictLabels: Record<string, string> = {
	clear: "讲得清楚",
	partial: "只讲清了一半",
	unclear: "还讲不清楚",
};

const contractFieldLabels: Record<string, string> = {
	coreConflict: "核心冲突",
	protagonistDesire: "主角欲望",
	opposingForce: "对立阻力",
	irreducibilityTest: "不可替代性测试",
	readerHookQuestion: "读者钩子问题",
};

export function ContractReviewView({
	review,
}: {
	review: PremiseDialogueContractReviewOutput & { droppedPointCount?: number };
}) {
	return (
		<div className="grid gap-2.5 rounded-[10px] border border-[#d8e2f6] bg-[#f4f8ff] px-3.5 py-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-xs font-bold text-[#2f5faa]">费曼点评</span>
				<span className="rounded-full bg-white px-[9px] py-1 text-[11px] font-bold text-[#2f5faa]">
					{feynmanVerdictLabels[review.feynmanVerdict] ?? review.feynmanVerdict}
				</span>
			</div>
			{review.divergencePoints.length ? (
				<div className="grid gap-2">
					{review.divergencePoints.map((point, index) => (
						<div
							key={`${point.field}-${index}`}
							className="rounded-[8px] border border-[#c9dbf8] bg-white px-3 py-2 text-xs leading-5"
						>
							<b className="mb-0.5 block text-[#2f5faa]">
								{contractFieldLabels[point.field] ?? point.field}
							</b>
							<span className="block text-[#464d57]">
								你的说法：{point.authorView}
							</span>
							<span className="block text-[#69707d]">
								编辑的对照：{point.editorView}
							</span>
							<span className="mt-0.5 block font-bold text-[#2f5faa]">
								追问：{point.questionToAuthor}
							</span>
						</div>
					))}
				</div>
			) : (
				<p className="m-0 text-xs leading-5 text-[#405a85]">
					没有发现你与编辑结论的分歧点。
				</p>
			)}
			{review.reason ? (
				<p className="m-0 text-xs leading-5 text-[#405a85]">{review.reason}</p>
			) : null}
			<blockquote className="m-0 rounded-[8px] border border-[#c9dbf8] bg-white px-3 py-2 text-xs leading-5 text-[#2f5faa]">
				锚定的你的原话：“{review.quoteAuthor}”
			</blockquote>
			{review.droppedPointCount ? (
				<p className="m-0 text-[11px] leading-5 text-[#955208]">
					另有 {review.droppedPointCount} 条点评未能锚定你的原话，已被服务端拒绝。
				</p>
			) : null}
		</div>
	);
}
