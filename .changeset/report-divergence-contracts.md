---
"@ai-novel-diagnosis/ai-core": minor
---

Add the report-divergence module: contradiction detection between a quick-review report and a story-audit report for the same chapter. The prompt enforces contradictions-only (absence in one report is not a divergence) and hands adjudication back to the author with a question; anchorReportDivergencePoints requires each point to quote both reports verbatim and drops the rest with a disclosed count; parseReportDivergenceOutput keeps an explicit empty array distinct from a missing field.
