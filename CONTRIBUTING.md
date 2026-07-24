# Contributing

感谢你关注 AI网文诊断台 / AI Novel Diagnosis Desk。

This project is in Alpha. Contributions are welcome, but please keep changes small, testable, and aligned with the local-first, BYOK product direction and the authoritative [product doctrine](./docs/product-doctrine.md).

## Before You Start

- Do not commit API keys, uploaded novels, model outputs, local databases, or files under `.local`.
- Do not attach copyrighted full-text novels to public issues or pull requests.
- Keep generated One CLI guidance files such as `AGENTS.md` and `CLAUDE.md` unchanged unless the change is intentionally about workspace rules.
- Prefer focused pull requests: one bug fix, one feature slice, or one documentation improvement at a time.

## Local Setup

```bash
pnpm install
pnpm run dev:raw
```

If One CLI is installed, you can also run:

```bash
pnpm run dev:dry-run
pnpm run dev
```

Default local URLs:

```text
Web: http://localhost:3000
API: http://localhost:3001/api/v1
```

## Quality Gates

Run the checks that match your change. Before opening a larger pull request, run:

```bash
pnpm run check
pnpm run test
pnpm run build
```

For a full local verification:

```bash
pnpm run ci
```

## Product Principles

- The product distills mature editorial process into evidence-backed, author-controlled, versioned revision and retest workflows; a new metric or model output is not valuable until it enters that loop.
- Treat model findings as editorial hypotheses. Do not market scores as objective quality, confidence as calibrated correctness, or text analysis as traffic/retention causality.
- Preserve facts, rule-generated candidates, model verification, and author decisions as separate layers. Rejected findings and author intent are first-class data.
- A retest must compare real manuscript versions and issue states. Cached reruns or same-model self-grading are not evidence that a revision worked.
- The tool should critique, analyze, and help writers learn. It should not position itself as a one-click plagiarism or content-laundering tool.
- Originalized exports must keep risk warnings visible and separate source notes from abstracted creative assets.
- BYOK model settings should remain user-owned. API keys should be sent per request and not persisted by default.
- UI changes should reduce cognitive load: group features by workflow, explain unfamiliar controls, and make job state obvious.

## Pull Request Checklist

- [ ] The change is scoped and described clearly.
- [ ] Relevant checks pass locally.
- [ ] README or docs are updated when behavior changes.
- [ ] No secrets, uploaded novels, generated model outputs, or local database files are committed.
- [ ] Risk and copyright-sensitive features keep user-facing warnings intact.
- [ ] Product claims, metrics, and acceptance criteria follow `docs/product-doctrine.md`.
