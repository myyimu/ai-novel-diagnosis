name: research-skill-foundation
description: Foundation skill for reusable static quality checks and adapter checks
author: ai-novel-diagnosis

## Purpose

`research-skill-foundation` provides a reusable baseline for script-backed checks:

- shared skill/static quality checks
- python invocation guard for Windows-compatible hook execution
- hook locale-safety guard
- shared file consistency drift checks
- Codex and OpenCode adapter checks

The intent is to keep CI and local `one:doctor` style validation stable across projects while remaining configurable:

- repository-specific directories are auto-detected
- checks for absent optional surfaces are skipped
- adapter checks only run when related directories exist

## Scripts

The following scripts live in `scripts/skill-foundation`:

- `run-foundation-checks.sh`: one-shot entry point for all foundation checks
- `static-check.sh`: checks `SKILL.md` frontmatter and local link references
- `check-python-invocation.sh`: blocks brittle direct `python/python3` usage patterns
- `check-hook-locale-safety.sh`: validates hook locale-compatibility requirements
- `check-shared-files.sh`: detects drift across duplicated shared files
- `generate-codex-agents.py`: converts Claude-style markdown agent templates to Codex TOML
- `sync-opencode.py`: converts Claude-style markdown agent templates to OpenCode templates
- `check-codex-adapter.sh`: validates Codex adapter artifacts when present
- `check-opencode-adapter.sh`: validates OpenCode adapter artifacts when present

## NPM Script

The repository exposes:

- `pnpm run skill:foundation:check` → `bash scripts/skill-foundation/run-foundation-checks.sh`

Use this for local pre-commit style discovery and quick regressions.
