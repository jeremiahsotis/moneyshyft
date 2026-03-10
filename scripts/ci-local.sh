#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-origin/production}"

echo "== policy =="
npm run policy:check

echo "== connectshyft route ownership =="
bash scripts/verify-connectshyft-route-ownership.sh

echo "== lint (or discovery fallback) =="
bash scripts/lint-or-discovery.sh

echo "== test changed =="
bash scripts/test-changed.sh "$base_ref"

echo "== burn-in (10 iterations) =="
bash scripts/burn-in.sh 10 "$base_ref"

echo "== quality gates =="
bash scripts/quality-gates.sh

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ "$branch" == "codex/epic-0-ops" ]]; then
  echo "== epic-0 quality gates =="
  bash scripts/quality-gates-epic0.sh
fi
