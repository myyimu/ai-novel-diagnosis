"use client";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { DeepDiagnosisStepper } from "./DeepDiagnosisStepper";

interface DeepDiagnosisPageProps {
	entryView?: "deep" | "score" | "evidence";
}

export function DeepDiagnosisPage({ entryView = "deep" }: DeepDiagnosisPageProps) {
	const handlers = useWorkspaceHandlers("chapter");

	return (
		<WorkspaceTaskFrame
			title="深度质检"
			description="参考资料、评分标准和评分结果按步骤推进，证据链跟随评分结果展示。"
			status={handlers.providerLabel}
			taskNav={{
				items: [
					{
						id: "deep-stepper",
						label: "深度质检",
						description: "依次完成参考、评分标准、评分结果",
						meta: "当前",
					},
				],
				activeId: "deep-stepper",
				onChange: () => {},
			}}
			inspector={{
				title: "步骤详情",
				description: "点选具体证据后展示详情。",
				sections: [],
			}}
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
		</WorkspaceTaskFrame>
	);
}
