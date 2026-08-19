---
"@ai-novel-diagnosis/ai-core": minor
---

Add premise engine card and finding review contracts. `PremiseEngineCard` is the author-confirmed restatement of the story engine (0..1 per project, `status: draft | confirmed` — the stage-① milestone input); `PremiseFindingReview` persists author decisions on cliché findings (确认/作者意图/误报/搁置). `PremiseReviewResult` gains an optional server-stamped `reviewId` so decisions stay attached to the exact review run, plus shared label maps (`PREMISE_VERDICT_LABELS`, `PREMISE_ENGINE_CARD_STATUS_LABELS`, `PREMISE_FINDING_REVIEW_STATE_LABELS`).
