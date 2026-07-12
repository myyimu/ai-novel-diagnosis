"use client";

import { useRouter } from "next/navigation";
import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { DeepDiagnosisStepper } from "./DeepDiagnosisStepper";

interface DeepDiagnosisPageProps {
	entryView?: "deep" | "score" | "evidence";
}

export function DeepDiagnosisPage({ entryView = "deep" }: DeepDiagnosisPageProps) {
	const handlers = useWorkspaceHandlers("chapter");
	const router = useRouter();

	return (
		<RedesignWorkspaceShell
			active="deep"
			providerLabel={handlers.providerLabel}
			crumb={
				<>
					诊断 / <b className="text-[#1f2329]">深度质检</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton onClick={() => router.push("/project/current")}>
						返回工作区
					</RedesignTopButton>
					<RedesignTopButton
						variant="primary"
						onClick={() => router.push("/settings/provider")}
					>
						AI 设置
					</RedesignTopButton>
				</>
			}
		>
			<DeepDiagnosisStepper
				entryView={entryView}
				loading={handlers.loading === "rubric" || handlers.loading === "score"}
				quickReviewResult={handlers.quickReviewResult}
				referenceText={handlers.referenceText}
				referenceTitle={handlers.referenceTitle}
				chapterTitle={handlers.chapterTitle}
				chapterText={handlers.chapterText}
				rubricResult={handlers.rubricResult}
				scoreResult={handlers.scoreResult}
				scoreEvidenceChain={handlers.scoreEvidenceChain}
				hasRubricCache={Boolean(handlers.rubricCacheHit)}
				hasScoreCache={Boolean(handlers.scoreCacheHit)}
				onReferenceTextChange={handlers.handleReferenceTextChange}
				onImportReferenceFile={handlers.importReferenceFile}
				onBuildRubric={handlers.buildRubric}
				onScoreChapter={handlers.scoreChapter}
				onRebuildRubric={() => handlers.buildRubric(true)}
				onRescoreChapter={() => handlers.scoreChapter(true)}
				diagnosisExampleOptions={handlers.diagnosisExampleOptions}
				onUseExampleChapter={handlers.useExampleChapter}
			/>
		</RedesignWorkspaceShell>
	);
}
