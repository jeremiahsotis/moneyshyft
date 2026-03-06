#!/usr/bin/env bash
set -euo pipefail

PATCH_FILE=""
PATCH_CLASS=""
MODE="check"
STRIP_LEVEL=""
ALLOW_REPAIRED=false

REMEDIATION_MODE=""
REQUIRED_STRIP=""

usage() {
  cat <<'USAGE'
Usage: bash scripts/verified-patch-apply.sh [options]

Required:
  --patch <path>      Patch file path
  --class <id>        Patch class (01..08)

Optional:
  --mode <mode>       check (default) or apply
  --strip <n>         Override strip level passed to git apply -p<n>
  --allow-repaired    Allow repaired/rebuilt patches for non-clean classes
  -h, --help          Show this help

Examples:
  bash scripts/verified-patch-apply.sh --patch /tmp/01.patch --class 01 --mode check
  bash scripts/verified-patch-apply.sh --patch /tmp/01.patch --class 01 --mode apply
  bash scripts/verified-patch-apply.sh --patch /tmp/08.patch --class 08 --mode check --allow-repaired
USAGE
}

fail() {
  echo "$1"
  exit "${2:-1}"
}

normalize_class() {
  local class_id="$1"

  if [[ "$class_id" =~ ^[0-9]+$ ]]; then
    printf "%02d" "$((10#$class_id))"
    return 0
  fi

  echo "$class_id"
}

resolve_class_policy() {
  case "$PATCH_CLASS" in
    01)
      REMEDIATION_MODE="apply-clean"
      REQUIRED_STRIP="4"
      ;;
    02)
      REMEDIATION_MODE="repair-stale"
      REQUIRED_STRIP="1"
      ;;
    03)
      REMEDIATION_MODE="rebuild-malformed"
      REQUIRED_STRIP="1"
      ;;
    04)
      REMEDIATION_MODE="repair-stale"
      REQUIRED_STRIP="1"
      ;;
    05)
      REMEDIATION_MODE="defer-structural"
      REQUIRED_STRIP="1"
      ;;
    06)
      REMEDIATION_MODE="defer-structural"
      REQUIRED_STRIP="1"
      ;;
    07)
      REMEDIATION_MODE="apply-clean"
      REQUIRED_STRIP="1"
      ;;
    08)
      REMEDIATION_MODE="repair-stale"
      REQUIRED_STRIP="1"
      ;;
    *)
      fail "PATCH_CLASS_INVALID: unsupported class '$PATCH_CLASS' (expected 01..08)"
      ;;
  esac
}

validate_patch_shape() {
  if [[ ! -f "$PATCH_FILE" ]]; then
    fail "PATCH_INPUT_INVALID: patch file not found: $PATCH_FILE"
  fi

  if ! grep -Eq '^diff --git ' "$PATCH_FILE"; then
    fail "PATCH_PARSE_INVALID: missing 'diff --git' header in $PATCH_FILE"
  fi

  if ! grep -Eq '^@@ ' "$PATCH_FILE"; then
    fail "PATCH_PARSE_INVALID: missing hunk headers ('@@') in $PATCH_FILE"
  fi
}

normalize_patch_path() {
  local raw_path="$1"
  local strip_level="$2"
  local normalized="$raw_path"
  local i=0
  local segments_to_strip="$strip_level"

  # git apply -pN strips path components including the "a/" or "b/" prefix.
  # This function receives paths after that prefix was removed, so strip one less.
  if (( segments_to_strip > 0 )); then
    segments_to_strip=$((segments_to_strip - 1))
  fi

  while (( i < segments_to_strip )); do
    if [[ "$normalized" != */* ]]; then
      echo ""
      return 1
    fi
    normalized="${normalized#*/}"
    i=$((i + 1))
  done

  echo "$normalized"
}

validate_patch_targets() {
  local strip_level="$1"
  local old_path=""
  local line_no=0
  local -a missing_targets=()

  while IFS= read -r line; do
    line_no=$((line_no + 1))

    if [[ "$line" =~ ^---[[:space:]]a/(.+)$ ]]; then
      old_path="${BASH_REMATCH[1]}"
      if [[ "$old_path" != "/dev/null" ]]; then
        local normalized_old_path
        normalized_old_path="$(normalize_patch_path "$old_path" "$strip_level" || true)"
        if [[ -z "$normalized_old_path" ]]; then
          missing_targets+=("$old_path (cannot normalize with -p$strip_level, line $line_no)")
        elif [[ ! -f "$normalized_old_path" ]]; then
          missing_targets+=("$normalized_old_path (normalized from $old_path, line $line_no)")
        fi
      fi
      continue
    fi

    if [[ "$line" =~ ^\+\+\+[[:space:]]b/(.+)$ ]]; then
      local new_path="${BASH_REMATCH[1]}"
      if [[ "$old_path" == "/dev/null" ]]; then
        local normalized_new_path
        normalized_new_path="$(normalize_patch_path "$new_path" "$strip_level" || true)"
        if [[ -z "$normalized_new_path" ]]; then
          missing_targets+=("$new_path (cannot normalize with -p$strip_level, line $line_no)")
          continue
        fi
        local new_dir
        new_dir="$(dirname "$normalized_new_path")"
        if [[ "$new_dir" != "." && ! -d "$new_dir" ]]; then
          missing_targets+=("$normalized_new_path (normalized from $new_path, target dir missing: $new_dir, line $line_no)")
        fi
      fi
    fi
  done < "$PATCH_FILE"

  if [[ "${#missing_targets[@]}" -gt 0 ]]; then
    echo "PATCH_TARGET_MISSING: patch references missing targets"
    for target in "${missing_targets[@]}"; do
      echo "  - $target"
    done
    echo "Remediation: classify as repair-stale/defer-structural and rebuild or defer before apply."
    exit 1
  fi
}

validate_json_payloads() {
  local invalid_payloads=""

  if ! invalid_payloads="$(
    node - "$PATCH_FILE" <<'NODE'
const fs = require('fs');

const patchPath = process.argv[2];
const content = fs.readFileSync(patchPath, 'utf8');
const lines = content.split(/\r?\n/);
const issues = [];

const dataArgRegex = /(?:^|\s)(?:-d|--data|--data-raw|--data-binary)(?:=|\s+)(?:"((?:\\.|[^"\\])*)"|'([^']*)')/g;

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (!line.startsWith('+') || line.startsWith('+++')) {
    continue;
  }

  let match;
  while ((match = dataArgRegex.exec(line)) !== null) {
    let payload = '';

    if (typeof match[2] === 'string') {
      payload = match[2];
    } else {
      const rawDoubleQuoted = match[1] || '';
      payload = rawDoubleQuoted
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }

    const trimmed = payload.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      continue;
    }

    try {
      JSON.parse(trimmed);
    } catch (error) {
      issues.push({
        line: i + 1,
        message: error.message,
        payload: trimmed.slice(0, 160)
      });
    }
  }
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.log(`${issue.line}\t${issue.message}\t${issue.payload}`);
  }
  process.exit(1);
}
NODE
  )"; then
    echo "PATCH_JSON_INVALID: malformed JSON payload detected in patch additions"
    while IFS=$'\t' read -r line_no parse_message payload_preview; do
      [[ -z "$line_no" ]] && continue
      echo "  - line $line_no: $parse_message"
      echo "    payload: $payload_preview"
    done <<< "$invalid_payloads"
    echo "Remediation: fix JSON payload quoting/content before any apply attempt."
    exit 1
  fi
}

run_git_apply_check() {
  local strip_level="$1"
  local output_file
  output_file="$(mktemp)"

  if git apply --check --verbose "-p${strip_level}" "$PATCH_FILE" >"$output_file" 2>&1; then
    rm -f "$output_file"
    return 0
  fi

  echo "PATCH_CHECK_FAILED: git apply --check failed for class $PATCH_CLASS (strip -p$strip_level)"
  cat "$output_file"
  rm -f "$output_file"
  return 1
}

is_apply_eligible() {
  case "$REMEDIATION_MODE" in
    apply-clean)
      return 0
      ;;
    repair-stale|rebuild-malformed)
      [[ "$ALLOW_REPAIRED" == true ]]
      ;;
    defer-structural)
      return 1
      ;;
    *)
      return 1
      ;;
  esac
}

preflight_check() {
  local strip_level="$1"

  validate_patch_shape
  validate_patch_targets "$strip_level"
  validate_json_payloads

  local git_check_ok=true
  if ! run_git_apply_check "$strip_level"; then
    git_check_ok=false
  fi

  if [[ "$REMEDIATION_MODE" == "defer-structural" ]]; then
    fail "PATCH_CLASS_DEFERRED: class $PATCH_CLASS requires defer-until-structure-ready. Do not apply until target structure exists." 2
  fi

  if [[ "$REMEDIATION_MODE" != "apply-clean" && "$ALLOW_REPAIRED" != true ]]; then
    fail "PATCH_REMEDIATION_REQUIRED: class $PATCH_CLASS is '$REMEDIATION_MODE'. Perform remediation first, then re-run with --allow-repaired after rebuilding/repairing patch content." 2
  fi

  if [[ "$git_check_ok" != true ]]; then
    fail "PATCH_PRECHECK_FAILED: patch did not pass git apply --check" 1
  fi

  echo "PATCH_PRECHECK_OK: class $PATCH_CLASS ($REMEDIATION_MODE) ready for verified apply path (strip -p$strip_level)"
}

run_apply() {
  local strip_level="$1"

  if ! is_apply_eligible; then
    fail "PATCH_APPLY_BLOCKED: class $PATCH_CLASS ($REMEDIATION_MODE) is not eligible for direct apply. Follow remediation workflow." 2
  fi

  git apply "-p${strip_level}" "$PATCH_FILE"
  echo "PATCH_APPLY_OK: applied $PATCH_FILE with -p$strip_level"

  echo "PATCH_POST_VERIFY: git status --short"
  git status --short

  echo "PATCH_POST_VERIFY: npm run policy:check"
  npm run policy:check

  echo "PATCH_POST_VERIFY_OK: governance checks passed"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --patch)
      PATCH_FILE="${2:-}"
      shift 2
      ;;
    --class)
      PATCH_CLASS="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --strip)
      STRIP_LEVEL="${2:-}"
      shift 2
      ;;
    --allow-repaired)
      ALLOW_REPAIRED=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "PATCH_INPUT_INVALID: unknown argument '$1'"
      ;;
  esac
done

if [[ -z "$PATCH_FILE" ]]; then
  fail "PATCH_INPUT_INVALID: --patch is required"
fi

if [[ -z "$PATCH_CLASS" ]]; then
  fail "PATCH_INPUT_INVALID: --class is required"
fi

PATCH_CLASS="$(normalize_class "$PATCH_CLASS")"
resolve_class_policy

if [[ "$MODE" != "check" && "$MODE" != "apply" ]]; then
  fail "PATCH_INPUT_INVALID: --mode must be 'check' or 'apply'"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "PATCH_ENV_INVALID: command must run inside a git repository"
fi

if [[ -z "$STRIP_LEVEL" ]]; then
  STRIP_LEVEL="$REQUIRED_STRIP"
fi

if [[ ! "$STRIP_LEVEL" =~ ^[0-9]+$ ]]; then
  fail "PATCH_INPUT_INVALID: --strip must be an integer >= 0"
fi

if [[ "$PATCH_CLASS" == "01" && "$STRIP_LEVEL" != "4" ]]; then
  fail "PATCH_INPUT_INVALID: class 01 requires strip normalization -p4"
fi

preflight_check "$STRIP_LEVEL"

if [[ "$MODE" == "apply" ]]; then
  run_apply "$STRIP_LEVEL"
fi
