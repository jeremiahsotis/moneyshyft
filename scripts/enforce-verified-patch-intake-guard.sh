#!/usr/bin/env bash
set -euo pipefail

ALLOWED_APPLY_SCRIPT="scripts/verified-patch-apply.sh"
GUARD_SCRIPT="scripts/enforce-verified-patch-intake-guard.sh"
POLICY_DOC="docs/policies/verified_patch_application_policy.md"
WATCH_PATHS=("scripts" ".github/workflows" "package.json")
EXEMPT_FILE_PATTERNS=("scripts/test-*.sh")

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

collect_changed_watch_files() {
  local range="$1"
  git diff --name-only "$range" -- "${WATCH_PATHS[@]}" | sort -u
}

collect_watch_files_from_head() {
  git ls-tree -r --name-only HEAD -- "${WATCH_PATHS[@]}" | sort -u
}

validate_policy_document() {
  if [[ ! -f "$POLICY_DOC" ]]; then
    echo "Patch intake guard failed: missing required policy document: $POLICY_DOC"
    echo "Remediation: add the verified patch workflow and remediation matrix to that policy file."
    exit 1
  fi

  local missing_classes=()
  local class_id
  for class_id in 01 02 03 04 05 06 07 08; do
    local class_marker
    class_marker="| \`${class_id}\` |"
    if ! grep -Fq "$class_marker" "$POLICY_DOC"; then
      missing_classes+=("$class_id")
    fi
  done

  if [[ "${#missing_classes[@]}" -gt 0 ]]; then
    echo "Patch intake guard failed: policy class matrix is incomplete in $POLICY_DOC"
    echo "Missing classes: ${missing_classes[*]}"
    echo "Remediation: document all patch classes (01..08) with handling rules."
    exit 1
  fi

  if ! grep -Fq "Invalid JSON" "$POLICY_DOC"; then
    echo "Patch intake guard failed: $POLICY_DOC must include invalid JSON remediation guidance."
    echo "Remediation: add explicit JSON payload correction requirements before apply attempts."
    exit 1
  fi
}

validate_package_script_hook() {
  if [[ ! -f "package.json" ]]; then
    echo "Patch intake guard failed: package.json not found"
    exit 1
  fi

  if ! grep -Eq '"patch:apply:verified"[[:space:]]*:[[:space:]]*"bash scripts/verified-patch-apply\.sh"' package.json; then
    echo "Patch intake guard failed: package.json is missing script hook 'patch:apply:verified'"
    echo "Remediation: add \"patch:apply:verified\": \"bash scripts/verified-patch-apply.sh\" to package scripts."
    exit 1
  fi
}

scan_file_for_apply_usage() {
  local file="$1"
  local mode="$2"
  local range="${3:-}"

  if [[ "$mode" == "diff" ]]; then
    git diff --unified=0 --no-color "$range" -- "$file" \
      | awk '/^\+[^+]/ { sub(/^\+/, "", $0); print }' \
      | grep -En '\bgit[[:space:]]+apply\b' || true
    return 0
  fi

  grep -En '\bgit[[:space:]]+apply\b' "$file" || true
}

is_exempt_file() {
  local file="$1"

  if [[ "$file" == "$ALLOWED_APPLY_SCRIPT" || "$file" == "$GUARD_SCRIPT" ]]; then
    return 0
  fi

  local pattern
  for pattern in "${EXEMPT_FILE_PATTERNS[@]}"; do
    if [[ "$file" == $pattern ]]; then
      return 0
    fi
  done

  return 1
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Patch intake guard skipped: not in a git repository."
  exit 0
fi

validate_policy_document
validate_package_script_hook

compare_range="$(resolve_compare_range || true)"
scan_mode="diff"
scan_files=()

if [[ -z "$compare_range" ]]; then
  scan_mode="full"
else
  while IFS= read -r file; do
    [[ -n "$file" ]] && scan_files+=("$file")
  done < <(collect_changed_watch_files "$compare_range")
fi

if [[ "$scan_mode" == "full" ]] || [[ "${#scan_files[@]}" -eq 0 ]]; then
  scan_mode="full"
  scan_files=()
  while IFS= read -r file; do
    [[ -n "$file" ]] && scan_files+=("$file")
  done < <(collect_watch_files_from_head)
fi

violations=()

for file in "${scan_files[@]}"; do
  [[ ! -f "$file" ]] && continue

  if is_exempt_file "$file"; then
    continue
  fi

  usage_lines="$(scan_file_for_apply_usage "$file" "$scan_mode" "$compare_range")"
  if [[ -n "$usage_lines" ]]; then
    violations+=("$file")
    echo "Patch intake guard violation in $file"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      echo "  + $line"
    done <<< "$usage_lines"
  fi
done

if [[ "${#violations[@]}" -gt 0 ]]; then
  echo "Patch intake guard failed: ad hoc git apply usage detected outside verified pathway."
  echo "Allowed pathway: bash scripts/verified-patch-apply.sh --patch <path> --class <01..08> --mode check|apply"
  echo "Remediation: remove direct git apply calls from automation/workflow files and use the verified script."
  exit 1
fi

echo "Patch intake guard passed"
