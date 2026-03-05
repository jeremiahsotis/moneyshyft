#!/usr/bin/env bash
set -euo pipefail

MODULE_ROUTES_DIR="apps/routeshyft-api/src/routes/api/v1"
PLATFORM_CONTRACTS_FILE="${MODULE_ROUTES_DIR}/platform-contracts.ts"

resolve_compare_range() {
  local event="${GITHUB_EVENT_NAME:-local}"
  local base_branch="${GITHUB_BASE_REF:-}"

  if [[ "$event" == "pull_request" && -n "$base_branch" ]]; then
    if git rev-parse --verify --quiet "origin/${base_branch}" >/dev/null; then
      echo "origin/${base_branch}...HEAD"
      return 0
    fi

    if git rev-parse --verify --quiet "${base_branch}" >/dev/null; then
      echo "${base_branch}...HEAD"
      return 0
    fi
  fi

  for candidate in origin/codex/dev codex/dev origin/main main origin/master master; do
    if git rev-parse --verify --quiet "$candidate" >/dev/null; then
      echo "${candidate}...HEAD"
      return 0
    fi
  done

  return 1
}

collect_changed_route_files() {
  local range="$1"
  git diff --name-only "$range" -- "$MODULE_ROUTES_DIR" | sort -u
}

has_ad_hoc_response_additions() {
  local range="$1"
  local file="$2"

  git diff --unified=0 --no-color "$range" -- "$file" \
    | awk '/^\+[^+]/ { print }' \
    | grep -Eq 'res(\.status\([^)]*\))?\.json[[:space:]]*\('
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Envelope helper guard skipped: not in a git repository."
  exit 0
fi

compare_range="$(resolve_compare_range || true)"
if [[ -z "$compare_range" ]]; then
  echo "Envelope helper guard skipped: unable to resolve compare range."
  exit 0
fi

changed_files=()
while IFS= read -r file; do
  if [[ -n "$file" ]]; then
    changed_files+=("$file")
  fi
done < <(collect_changed_route_files "$compare_range")
if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "Envelope helper guard passed: no module route changes detected."
  exit 0
fi

violations=()
for file in "${changed_files[@]}"; do
  if [[ "$file" == "$PLATFORM_CONTRACTS_FILE" ]]; then
    continue
  fi

  if [[ "$file" != *.ts ]]; then
    continue
  fi

  if has_ad_hoc_response_additions "$compare_range" "$file"; then
    violations+=("$file")
  fi
done

if [[ "${#violations[@]}" -gt 0 ]]; then
  echo "Envelope helper guard failed: added ad hoc response serialization detected."
  echo "Use shared helpers (success/refusal/systemError) for new or modified module endpoints."
  echo "Files with violations:"
  for file in "${violations[@]}"; do
    echo "  - $file"
    git diff --unified=0 --no-color "$compare_range" -- "$file" \
      | awk '/^\+[^+]/ && /res(\.status\([^)]*\))?\.json[[:space:]]*\(/ { sub(/^\+/, "    +", $0); print }'
  done
  exit 1
fi

echo "Envelope helper guard passed"
