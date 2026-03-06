#!/usr/bin/env bash
set -euo pipefail

MODULE_ROUTES_DIR="apps/routeshyft-api/src/routes/api/v1"
PLATFORM_CONTRACTS_FILE="${MODULE_ROUTES_DIR}/platform-contracts.ts"

resolve_compare_range() {
  local event="${GITHUB_EVENT_NAME:-local}"
  local base_branch="${GITHUB_BASE_REF:-}"

  if [[ "$event" == "pull_request" && -n "$base_branch" ]]; then
    if [[ "$base_branch" == "production" ]] && git rev-parse --verify --quiet "origin/codex/dev" >/dev/null; then
      # Promotion PRs should only enforce net-new additions relative to codex/dev,
      # not re-gate legacy route serializers carried by branch divergence.
      echo "origin/codex/dev..HEAD"
      return 0
    fi

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

resolve_compare_left_ref() {
  local range="$1"
  local left_ref=""

  if [[ "$range" == *"..."* ]]; then
    left_ref="${range%%...*}"
  elif [[ "$range" == *".."* ]]; then
    left_ref="${range%%..*}"
  fi

  if [[ -z "$left_ref" ]]; then
    return 1
  fi

  echo "$left_ref"
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

ad_hoc_response_addition_lines() {
  local range="$1"
  local file="$2"

  git diff --unified=0 --no-color "$range" -- "$file" \
    | awk '/^\+[^+]/ && /res(\.status\([^)]*\))?\.json[[:space:]]*\(/ { sub(/^\+/, "", $0); print }'
}

resolve_legacy_route_path() {
  local file="$1"

  if [[ "$file" =~ ^apps/routeshyft-api/src/routes/api/v1/(.+)$ ]]; then
    echo "src/src/routes/api/v1/${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

is_legacy_route_move_without_content_change() {
  local compare_left_ref="$1"
  local file="$2"
  local legacy_path=""
  local head_blob=""
  local legacy_blob=""

  if [[ -z "$compare_left_ref" ]]; then
    return 1
  fi

  legacy_path="$(resolve_legacy_route_path "$file" || true)"
  if [[ -z "$legacy_path" ]]; then
    return 1
  fi

  if ! git cat-file -e "${compare_left_ref}:${legacy_path}" 2>/dev/null; then
    return 1
  fi

  head_blob="$(git rev-parse "HEAD:${file}" 2>/dev/null || true)"
  legacy_blob="$(git rev-parse "${compare_left_ref}:${legacy_path}" 2>/dev/null || true)"

  [[ -n "$head_blob" && "$head_blob" == "$legacy_blob" ]]
}

added_ad_hoc_responses_match_legacy_route_file() {
  local compare_left_ref="$1"
  local range="$2"
  local file="$3"
  local legacy_path=""
  local legacy_content=""
  local found_any="false"
  local line=""

  if [[ -z "$compare_left_ref" ]]; then
    return 1
  fi

  legacy_path="$(resolve_legacy_route_path "$file" || true)"
  if [[ -z "$legacy_path" ]]; then
    return 1
  fi

  if ! git cat-file -e "${compare_left_ref}:${legacy_path}" 2>/dev/null; then
    return 1
  fi

  legacy_content="$(git show "${compare_left_ref}:${legacy_path}" 2>/dev/null || true)"
  if [[ -z "$legacy_content" ]]; then
    return 1
  fi

  while IFS= read -r line; do
    found_any="true"
    if ! grep -Fqx "$line" <<<"$legacy_content"; then
      return 1
    fi
  done < <(ad_hoc_response_addition_lines "$range" "$file")

  [[ "$found_any" == "true" ]]
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
compare_left_ref="$(resolve_compare_left_ref "$compare_range" || true)"

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
    if is_legacy_route_move_without_content_change "$compare_left_ref" "$file"; then
      continue
    fi
    if added_ad_hoc_responses_match_legacy_route_file "$compare_left_ref" "$compare_range" "$file"; then
      continue
    fi
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
