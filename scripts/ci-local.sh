#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-origin/production}"

echo "== policy =="
npm run policy:check

echo "== lint (or discovery fallback) =="
bash scripts/lint-or-discovery.sh

echo "== test changed =="
bash scripts/test-changed.sh "$base_ref"

echo "== burn-in (10 iterations) =="
bash scripts/burn-in.sh 10 "$base_ref"

echo "== quality gates =="
bash scripts/quality-gates.sh
