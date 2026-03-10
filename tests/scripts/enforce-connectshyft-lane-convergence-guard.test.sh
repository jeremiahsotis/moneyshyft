#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$ROOT_DIR/scripts/enforce-connectshyft-lane-convergence-guard.sh"

if [[ ! -x "$GUARD" ]]; then
  echo "Guard script missing or not executable: $GUARD"
  exit 1
fi

# Positive test on current workspace should pass.
bash "$GUARD"
echo "Guard smoke test passed"
