#!/usr/bin/env bash
set -euo pipefail

# Foundation checker entrypoint for reusable skill-quality tooling.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "Error: not in a git repository"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_or_skip() {
  local name="$1"
  if [ -z "$name" ]; then
    return 0
  fi
  if [ -f "$SCRIPT_DIR/$name" ]; then
    echo "\n>>> Running $name"
    bash "$SCRIPT_DIR/$name"
  else
    echo "WARN: $name not found; skipped"
  fi
}

run_or_skip static-check.sh
run_or_skip check-python-invocation.sh

HOOK_DIR="$REPO_ROOT/skills/story-setup/references/templates/hooks"
if [ -d "$HOOK_DIR" ]; then
  run_or_skip check-hook-locale-safety.sh
else
  echo "\nSKIP: check-hook-locale-safety.sh (hooks path not present in this repo)"
fi

run_or_skip check-shared-files.sh

if [ -d "$REPO_ROOT/skills/story-setup/references/codex" ] && [ -d "$REPO_ROOT/skills/story-setup/references/templates" ]; then
  run_or_skip check-codex-adapter.sh
else
  echo "SKIP: check-codex-adapter.sh (Codex reference bundle not present in this repo)"
fi

if [ -d "$REPO_ROOT/skills/story-setup/references/opencode" ] && [ -d "$REPO_ROOT/skills/story-setup/references/templates" ]; then
  run_or_skip check-opencode-adapter.sh
else
  echo "SKIP: check-opencode-adapter.sh (OpenCode reference bundle not present in this repo)"
fi

echo "\n>>> All enabled foundation checks passed"
