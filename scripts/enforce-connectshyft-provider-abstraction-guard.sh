#!/usr/bin/env bash
set -euo pipefail

CONNECTSHYFT_SCOPE_PATHS=(
  "src/src/modules/connectshyft"
  "src/src/routes/api/v1/connectshyft.ts"
)
APPROVED_ADAPTER_CONTRACT_FILE="src/src/modules/connectshyft/providerRegistry.ts"
TWILIO_COUPLING_PATTERN="from[[:space:]]+['\"]twilio['\"]|require\\(['\"]twilio['\"]\\)|new[[:space:]]+Twilio[[:space:]]*\\(|\\bTWILIO_(ACCOUNT_SID|AUTH_TOKEN|API_KEY|API_SECRET)\\b|api\\.twilio\\.com|x-twilio-signature"

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

collect_changed_connectshyft_files() {
  local range="$1"
  git diff --name-only "$range" -- "${CONNECTSHYFT_SCOPE_PATHS[@]}" | sort -u
}

collect_connectshyft_files_from_head() {
  git ls-tree -r --name-only HEAD -- "${CONNECTSHYFT_SCOPE_PATHS[@]}" | sort -u
}

collect_file_twilio_coupling_lines() {
  local file="$1"
  grep -Ein "$TWILIO_COUPLING_PATTERN" "$file" || true
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
  done < <(collect_changed_connectshyft_files "$compare_range")
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
  done < <(collect_connectshyft_files_from_head)
  scan_mode="full"
fi

if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "ConnectShyft provider abstraction guard passed: no ConnectShyft source changes detected."
  exit 0
fi

violation_count=0
violation_output=""

for file in "${changed_files[@]}"; do
  if [[ ! "$file" =~ \.(ts|tsx|js|jsx|mjs|cjs)$ ]]; then
    continue
  fi

  if [[ "$file" == "$APPROVED_ADAPTER_CONTRACT_FILE" ]]; then
    continue
  fi

  if [[ ! -f "$file" ]]; then
    continue
  fi

  matched_lines="$(collect_file_twilio_coupling_lines "$file")"
  if [[ -z "$matched_lines" ]]; then
    continue
  fi

  violation_count=$((violation_count + 1))
  violation_output+=$'\n'"  - ${file}"$'\n'
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    violation_output+="    + ${line#*:}"$'\n'
  done <<< "$matched_lines"
done

if [[ "$violation_count" -gt 0 ]]; then
  echo "ConnectShyft provider abstraction guard failed: direct Twilio coupling detected outside approved adapter contracts."
  echo "Route provider-specific implementation through ${APPROVED_ADAPTER_CONTRACT_FILE}."
  echo "Violations:${violation_output}"
  exit 1
fi

echo "ConnectShyft provider abstraction guard passed"
