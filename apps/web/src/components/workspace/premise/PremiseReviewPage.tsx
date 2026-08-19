"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import {
	readPremiseFindingReviews,
	requestPremiseReview,
	upsertPremiseEngineCard,
	upsertPremiseFindingReview,
	type PremiseDialogueContractForm,
} from "@/lib/workspace-analysis-client";
import type {
	PremiseEngineCard,
	PremiseFindingReview,
	PremiseReviewResult,
} from "@/stores/workspace-store";
import {
	PremiseReviewCompose,
	type PremiseContractDraft,
	type PremiseFindingDecision,
} from "./PremiseReviewCompose";

/**
 * 立项审稿页（阶段①）：动笔前的编辑判断。
 * P1 闭环——审稿结果可改写为发动机卡（draft/confirmed）写入书籍病历；
 * 俗套点判定（确认/作者意图/误报/搁置）随 reviewId 落库。
 */
export function PremiseReviewPage() {
	const router = useRouter();
	const handlers = useWorkspaceHandlers("overview");

	const [premiseText, setPremiseText] = useState("");
	const [genre, setGenre] = useState("");
	const [result, setResult] = useState<PremiseReviewResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isReviewing, setIsReviewing] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const reviewStartRef = useRef(0);

	/* —— 阶段①闭环状态：契约草稿 + 保存/判定 —— */
	const [contract, setContract] = useState<PremiseContractDraft | null>(null);
	const [isSavingCard, setIsSavingCard] = useState(false);
	const [cardError, setCardError] = useState<string | null>(null);
	const [findingReviews, setFindingReviews] = useState<PremiseFindingReview[]>([]);
	const [isSavingReview, setIsSavingReview] = useState(false);

	const projectId = handlers.activeProjectId || "default-project";
	const engineCard = handlers.projectEngineCard;

	/* 回到本页时，用已保存的发动机卡回填契约草稿（未跑过审稿也能继续确认）。 */
	useEffect(() => {
		if (contract || !engineCard) {
			return;
		}
		setContract({
			premiseSummary: engineCard.premiseSummary,
			coreConflict: engineCard.coreConflict,
			protagonistDesire: engineCard.protagonistDesire,
			opposingForce: engineCard.opposingForce,
			irreducibilityTest: engineCard.irreducibilityTest,
			readerHookQuestion: engineCard.readerHookQuestion,
		});
	}, [contract, engineCard]);

	/* 已确认过的项目回填历史俗套判定，供同一 finding 复评时对照。 */
	useEffect(() => {
		if (!engineCard?.reviewId) {
			return;
		}
		let cancelled = false;
		readPremiseFindingReviews(projectId)
			.then((reviews) => {
				if (cancelled) {
					return;
				}
				setFindingReviews(
					reviews.filter((review) => review.reviewId === engineCard.reviewId),
				);
			})
			.catch(() => {
				/* 历史判定加载失败不阻塞审稿流程，列表保持为空。 */
			});
		return () => {
			cancelled = true;
		};
	}, [engineCard?.reviewId, projectId]);

	useEffect(() => {
		if (!isReviewing) {
			return;
		}
		const timer = window.setInterval(() => {
			setElapsedSeconds(Math.floor((Date.now() - reviewStartRef.current) / 1000));
		}, 1000);
		return () => {
			window.clearInterval(timer);
		};
	}, [isReviewing]);

	const runReview = async () => {
		const text = premiseText.trim();
		if (text.length < 20 || isReviewing) {
			return;
		}

		setIsReviewing(true);
		setError(null);
		reviewStartRef.current = Date.now();
		setElapsedSeconds(0);
		try {
			const review = await requestPremiseReview({
				provider: handlers.provider,
				premiseText: text,
				genre,
			});
			setResult(review);
			/* 新一轮审稿：以编辑重述预填契约草稿，清空上一轮判定。 */
			setContract({
				premiseSummary: review.premiseSummary,
				coreConflict: review.coreConflict,
				protagonistDesire: review.protagonistDesire,
				opposingForce: review.opposingForce,
				irreducibilityTest: review.irreducibilityTest,
				readerHookQuestion: review.readerHookQuestion,
			});
			setCardError(null);
			setFindingReviews([]);
		} catch (reviewError) {
			setResult(null);
			setError(
				reviewError instanceof Error
					? reviewError.message
					: "审稿请求失败，请检查模型连接后重试。",
			);
		} finally {
			setIsReviewing(false);
		}
	};

	const changeContract = (field: keyof PremiseContractDraft, value: string) => {
		setContract((current) => (current ? { ...current, [field]: value } : current));
	};

	const saveCard = async (status: "draft" | "confirmed") => {
		if (!contract || isSavingCard) {
			return;
		}

		setIsSavingCard(true);
		setCardError(null);
		const now = new Date().toISOString();
		const card: PremiseEngineCard = {
			projectId,
			status,
			premiseSummary: contract.premiseSummary,
			coreConflict: contract.coreConflict,
			protagonistDesire: contract.protagonistDesire,
			opposingForce: contract.opposingForce,
			irreducibilityTest: contract.irreducibilityTest,
			readerHookQuestion: contract.readerHookQuestion,
			engineVerdict: result?.engineVerdict ?? engineCard?.engineVerdict ?? "fixable",
			genre: genre || undefined,
			reviewId: result?.reviewId ?? engineCard?.reviewId,
			confirmedAt: status === "confirmed" ? (engineCard?.confirmedAt ?? now) : undefined,
			updatedAt: now,
		};
		try {
			const saved = await upsertPremiseEngineCard(card);
			handlers.setEngineCards((current) => [
				...current.filter((item) => item.projectId !== projectId),
				saved,
			]);
		} catch (saveError) {
			setCardError(
				saveError instanceof Error ? saveError.message : "发动机卡保存失败，请稍后重试。",
			);
		} finally {
			setIsSavingCard(false);
		}
	};

	const reviewFinding = async (findingId: string, reviewState: PremiseFindingDecision) => {
		const reviewId = result?.reviewId;
		if (!reviewId || isSavingReview) {
			return;
		}

		setIsSavingReview(true);
		try {
			const saved = await upsertPremiseFindingReview({
				projectId,
				reviewId,
				findingId,
				reviewState,
				updatedAt: new Date().toISOString(),
			});
			setFindingReviews((current) => [
				...current.filter((item) => item.findingId !== findingId),
				saved,
			]);
		} catch {
			toast.error("俗套判定保存失败", { description: "请稍后重试。" });
		} finally {
			setIsSavingReview(false);
		}
	};

	const writeFirstChapter = () => {
		router.push("/diagnose/quick");
	};

	/* 引导对话收束后，作者亲笔契约回填发动机卡草稿（覆盖编辑重述，亲笔优先）。 */
	const adoptDialogueContract = (dialogueContract: PremiseDialogueContractForm) => {
		setContract({ ...dialogueContract });
	};

	return (
		<PremiseReviewCompose
			providerLabel={handlers.providerLabel}
			isMockProvider={handlers.provider.kind === "mock"}
			provider={handlers.provider}
			premiseText={premiseText}
			onPremiseTextChange={setPremiseText}
			genre={genre}
			onGenreChange={setGenre}
			isReviewing={isReviewing}
			elapsedSeconds={elapsedSeconds}
			error={error}
			result={result}
			onRunReview={() => {
				void runReview();
			}}
			onWriteFirstChapter={writeFirstChapter}
			projectId={projectId}
			onAdoptDialogueContract={adoptDialogueContract}
			targetProjectName={handlers.activeProject?.name ?? "当前作品"}
			contract={contract}
			onContractChange={changeContract}
			engineCard={engineCard}
			isSavingCard={isSavingCard}
			cardError={cardError}
			onSaveCard={(status) => {
				void saveCard(status);
			}}
			findingReviews={findingReviews}
			isSavingReview={isSavingReview}
			onReviewFinding={(findingId, reviewState) => {
				void reviewFinding(findingId, reviewState);
			}}
		/>
	);
}
