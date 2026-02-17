#!/usr/bin/env bash
set -euo pipefail

iterations="${1:-10}"
base_ref="${2:-origin/production}"

if ! [[ "$iterations" =~ ^[0-9]+$ ]]; then
  echo "Iterations must be a positive integer. Actual: $iterations"
  exit 1
fi

if [[ "$iterations" -lt 1 ]]; then
  echo "Iterations must be >= 1"
  exit 1
fi

for ((i=1; i<=iterations; i++)); do
  echo "Burn-in iteration $i/$iterations"
  bash scripts/test-changed.sh "$base_ref"
done

echo "Burn-in complete"
