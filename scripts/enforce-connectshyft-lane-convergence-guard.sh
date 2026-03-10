#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

forbidden_paths=(
  "apps/moneyshyft-web/src/views/ConnectShyft"
  "apps/moneyshyft-web/src/components/connectshyft"
  "apps/moneyshyft-web/src/features/connectshyft"
)

violations=()
for path in "${forbidden_paths[@]}"; do
  abs="$ROOT_DIR/$path"
  if [[ -d "$abs" ]] && find "$abs" -type f | grep -q .; then
    violations+=("$path")
  fi
done

if [[ ${#violations[@]} -gt 0 ]]; then
  echo "ConnectShyft lane convergence guard failed. Duplicate UI found in money lane:"
  for v in "${violations[@]}"; do
    echo "- $v"
  done
  exit 1
fi

echo "ConnectShyft lane convergence guard passed"
