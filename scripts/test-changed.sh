#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-origin/production}"

if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
  echo "Base ref '$base_ref' not found locally, attempting fetch"
  git fetch --no-tags origin "${base_ref#origin/}:${base_ref}" || true
fi

mapfile -t changed_specs < <(git diff --name-only "$base_ref"...HEAD | grep -E '^tests/.*\.spec\.(ts|js)$' || true)

if [[ ${#changed_specs[@]} -eq 0 ]]; then
  echo "No changed spec files detected against $base_ref. Skipping test run."
  exit 0
fi

echo "Running changed specs (${#changed_specs[@]}) against $base_ref"
printf ' - %s\n' "${changed_specs[@]}"

npm run test:e2e -- "${changed_specs[@]}"
