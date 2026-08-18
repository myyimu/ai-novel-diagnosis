"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { requestPremiseReview } from "@/lib/workspace-analysis-client";
import type { PremiseReviewResult } from "@/stores/workspace-store";
import { PremiseReviewCompose } from "./PremiseReviewCompose";

/**
 * 立项审稿页（阶段①）：动笔前的编辑判断。
 * P0 页面态——结果只保存在本页 local state，不写入书籍病历；
 * 发动机卡的持久化与作者确认面板属于 P1 闭环。
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

	const writeFirstChapter = () => {
		router.push("/diagnose/quick");
	};

	return (
		<PremiseReviewCompose
			providerLabel={handlers.providerLabel}
			isMockProvider={handlers.provider.kind === "mock"}
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
		/>
	);
}
