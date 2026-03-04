#!/usr/bin/env bash
set -euo pipefail

GUARD_SCOPE_PATHS=(
  "src/src/modules/connectshyft"
  "src/src/routes/api/v1/connectshyft.ts"
  "src/src/modules/route"
  "src/src/routes/api/v1/route.ts"
)
APPROVED_ADAPTER_CONTRACT_FILE="src/src/modules/connectshyft/providerRegistry.ts"
TWILIO_COUPLING_PATTERN="from[[:space:]]+['\"]twilio['\"]|require\\(['\"]twilio['\"]\\)|new[[:space:]]+Twilio[[:space:]]*\\(|\\bTWILIO_(ACCOUNT_SID|AUTH_TOKEN|API_KEY|API_SECRET)\\b|api\\.twilio\\.com|x-twilio-signature"
CONNECT_TO_ROUTE_IMPORT_PATTERN="from[[:space:]]+['\"][^'\"]*(\\.\\./)+route(/|['\"])|require\\(['\"][^'\"]*(\\.\\./)+route(/|['\"])|import[[:space:]]*\\([[:space:]]*['\"][^'\"]*(\\.\\./)+route(/|['\"])|from[[:space:]]+['\"][^'\"]*modules/route(/|['\"])|require\\(['\"][^'\"]*modules/route(/|['\"])|import[[:space:]]*\\([[:space:]]*['\"][^'\"]*modules/route(/|['\"])|from[[:space:]]+['\"]@modules/route(/|['\"])|require\\(['\"]@modules/route(/|['\"])|import[[:space:]]*\\([[:space:]]*['\"]@modules/route(/|['\"])"
ROUTE_TO_CONNECT_IMPORT_PATTERN="from[[:space:]]+['\"][^'\"]*(\\.\\./)+connectshyft(/|['\"])|require\\(['\"][^'\"]*(\\.\\./)+connectshyft(/|['\"])|import[[:space:]]*\\([[:space:]]*['\"][^'\"]*(\\.\\./)+connectshyft(/|['\"])|from[[:space:]]+['\"][^'\"]*modules/connectshyft(/|['\"])|require\\(['\"][^'\"]*modules/connectshyft(/|['\"])|import[[:space:]]*\\([[:space:]]*['\"][^'\"]*modules/connectshyft(/|['\"])|from[[:space:]]+['\"]@modules/connectshyft(/|['\"])|require\\(['\"]@modules/connectshyft(/|['\"])|import[[:space:]]*\\([[:space:]]*['\"]@modules/connectshyft(/|['\"])"

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

collect_changed_guard_scope_files() {
  local range="$1"
  git diff --name-only "$range" -- "${GUARD_SCOPE_PATHS[@]}" | sort -u
}

collect_guard_scope_files_from_head() {
  git ls-tree -r --name-only HEAD -- "${GUARD_SCOPE_PATHS[@]}" | sort -u
}

collect_file_twilio_coupling_lines() {
  local file="$1"
  grep -Ein "$TWILIO_COUPLING_PATTERN" "$file" || true
}

is_connectshyft_source_file() {
  local file="$1"
  [[ "$file" == src/src/modules/connectshyft/* || "$file" == src/src/routes/api/v1/connectshyft.ts ]]
}

is_route_source_file() {
  local file="$1"
  [[ "$file" == src/src/modules/route/* || "$file" == src/src/routes/api/v1/route.ts ]]
}

collect_file_boundary_violation_lines() {
  local file="$1"

  if is_connectshyft_source_file "$file"; then
    grep -Ein "$CONNECT_TO_ROUTE_IMPORT_PATTERN" "$file" || true
    return 0
  fi

  if is_route_source_file "$file"; then
    grep -Ein "$ROUTE_TO_CONNECT_IMPORT_PATTERN" "$file" || true
    return 0
  fi

  return 0
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ConnectShyft provider abstraction guard skipped: not in a git repository."
  exit 0
fi

compare_range="$(resolve_compare_range || true)"

changed_files=()
scan_mode="diff"
if [[ -z "$compare_range" ]]; then
  scan_mode="full"
else
  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      changed_files+=("$file")
    fi
  done < <(collect_changed_guard_scope_files "$compare_range")
fi

if [[ "$scan_mode" == "full" ]] || (
  [[ "${#changed_files[@]}" -eq 0 ]] \
  && git rev-parse --verify --quiet HEAD >/dev/null \
  && ! git rev-parse --verify --quiet HEAD^ >/dev/null
); then
  changed_files=()
  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      changed_files+=("$file")
    fi
  done < <(collect_guard_scope_files_from_head)
  scan_mode="full"
fi

if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "ConnectShyft provider abstraction guard passed: no ConnectShyft/RouteShyft source changes detected."
  exit 0
fi

provider_violation_count=0
provider_violation_output=""
boundary_violation_count=0
boundary_violation_output=""

for file in "${changed_files[@]}"; do
  if [[ ! "$file" =~ \.(ts|tsx|js|jsx|mjs|cjs)$ ]]; then
    continue
  fi

  if [[ ! -f "$file" ]]; then
    continue
  fi

  if [[ "$file" != "$APPROVED_ADAPTER_CONTRACT_FILE" ]]; then
    matched_provider_lines="$(collect_file_twilio_coupling_lines "$file")"
    if [[ -n "$matched_provider_lines" ]]; then
      provider_violation_count=$((provider_violation_count + 1))
      provider_violation_output+=$'\n'"  - ${file}"$'\n'
      while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        provider_violation_output+="    + ${line}"$'\n'
      done <<< "$matched_provider_lines"
    fi
  fi

  matched_boundary_lines="$(collect_file_boundary_violation_lines "$file")"
  if [[ -n "$matched_boundary_lines" ]]; then
    boundary_violation_count=$((boundary_violation_count + 1))
    boundary_violation_output+=$'\n'"  - ${file}"$'\n'
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      boundary_violation_output+="    + ${line}"$'\n'
    done <<< "$matched_boundary_lines"
  fi
done

if [[ "$provider_violation_count" -gt 0 ]]; then
  echo "ConnectShyft provider abstraction guard failed: direct Twilio coupling detected outside approved adapter contracts."
  echo "Route provider-specific implementation through ${APPROVED_ADAPTER_CONTRACT_FILE}."
  echo "Violations:${provider_violation_output}"
fi

if [[ "$boundary_violation_count" -gt 0 ]]; then
  echo "ConnectShyft provider abstraction guard failed: direct route/connectshyft cross-module import-boundary violations detected."
  echo "Keep route and connectshyft isolated via contracts/events instead of direct imports."
  echo "Violations:${boundary_violation_output}"
fi

if [[ "$provider_violation_count" -gt 0 || "$boundary_violation_count" -gt 0 ]]; then
  exit 1
fi

echo "ConnectShyft provider abstraction guard passed"
