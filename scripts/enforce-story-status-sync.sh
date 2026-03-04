#!/usr/bin/env bash
set -euo pipefail

STATUS_FILE=""
STORIES_DIR="_bmad-output/implementation-artifacts"
STORY_KEY=""
LANE_OVERRIDE=""
TMP_DIR=""
SPRINT_MAP_FILE=""
LANE_CATALOG_FILE=""

usage() {
  cat <<'EOF'
Usage: bash scripts/enforce-story-status-sync.sh [options]

Options:
  --status-file <path>  Sprint status yaml override (default: resolved lane file)
  --stories-dir <path>  Story markdown folder (default: _bmad-output/implementation-artifacts)
  --story-key <key>     Validate only one story key (example: 1-2-..., a-1-..., ux-r3-...)
  --lane <lane-id>      Explicit lane override for sprint-status resolution
  -h, --help            Show this help message
EOF
}

cleanup() {
  if [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

resolve_branch() {
  local event="${GITHUB_EVENT_NAME:-local}"
  local branch_name=""

  if [[ "$event" == "local" ]]; then
    # Local checks must trust repository state, not CI-provided branch env vars.
    branch_name="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
    if [[ -z "$branch_name" || "$branch_name" == "HEAD" ]]; then
      branch_name="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
    fi
  else
    branch_name="${GITHUB_HEAD_REF:-}"
    if [[ -z "$branch_name" ]]; then
      branch_name="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
    fi
    if [[ -z "$branch_name" || "$branch_name" == "HEAD" ]]; then
      branch_name="${GITHUB_REF_NAME:-}"
    fi
  fi

  if [[ -z "$branch_name" || "$branch_name" == "HEAD" ]]; then
    echo "detached"
    return 0
  fi

  echo "$branch_name"
}

abs_path() {
  local input="$1"
  if [[ "$input" = /* ]]; then
    printf '%s\n' "$input"
    return 0
  fi
  printf '%s/%s\n' "$PWD" "$input"
}

is_valid_status() {
  local status="$1"
  [[ "$status" =~ ^(backlog|ready-for-dev|in-progress|review|done)$ ]]
}

is_valid_story_key() {
  local key="$1"
  [[ "$key" =~ ^(([0-9]+|[A-Za-z])-[0-9]+|[A-Za-z]+-[Rr][0-9]+)-.+$ ]]
}

is_allowed_transition() {
  local from="$1"
  local to="$2"
  case "$from" in
    backlog)
      [[ "$to" == "ready-for-dev" ]]
      ;;
    ready-for-dev)
      [[ "$to" == "in-progress" || "$to" == "backlog" ]]
      ;;
    in-progress)
      [[ "$to" == "review" || "$to" == "ready-for-dev" ]]
      ;;
    review)
      [[ "$to" == "done" || "$to" == "in-progress" ]]
      ;;
    done)
      [[ "$to" == "review" ]]
      ;;
    *)
      return 1
      ;;
  esac
}

is_allowed_closeout_multihop() {
  local from="$1"
  local to="$2"

  # Allow an in-progress -> done diff when both closeout transitions were
  # executed in sequence before commit (in-progress -> review -> done).
  # Also allow ready-for-dev -> review when dev-story marks in-progress
  # and review in one implementation diff (ready-for-dev -> in-progress -> review).
  [[ "$from" == "in-progress" && "$to" == "done" ]] \
    || [[ "$from" == "ready-for-dev" && "$to" == "review" ]]
}

extract_story_status_from_file() {
  local file="$1"
  awk '
    /^Status:[[:space:]]*/ {
      value=$0
      sub(/^Status:[[:space:]]*/, "", value)
      gsub(/\r$/, "", value)
      print tolower(value)
      exit 0
    }
  ' "$file"
}

extract_sprint_status_from_file() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    BEGIN { in_dev=0; found=0 }
    /^development_status:[[:space:]]*$/ { in_dev=1; next }
    in_dev && /^[^[:space:]]/ { in_dev=0 }
    in_dev {
      line=$0
      if (line ~ /^[[:space:]]{2}/) {
        sub(/^[[:space:]]{2}/, "", line)
        candidate=line
        sub(/:.*/, "", candidate)
        if (candidate == key) {
          value=line
          sub(/^[^:]+:[[:space:]]*/, "", value)
          gsub(/\r$/, "", value)
          print tolower(value)
          found=1
          exit 0
        }
      }
    }
    END {
      if (!found) {
        exit 1
      }
    }
  ' "$file"
}

extract_story_status_from_git_ref() {
  local ref="$1"
  local story_file="$2"
  local rel="$story_file"
  if [[ "$rel" == "$PWD/"* ]]; then
    rel="${rel#$PWD/}"
  fi
  if ! git cat-file -e "${ref}:${rel}" >/dev/null 2>&1; then
    return 1
  fi
  git show "${ref}:${rel}" | awk '
    /^Status:[[:space:]]*/ {
      value=$0
      sub(/^Status:[[:space:]]*/, "", value)
      gsub(/\r$/, "", value)
      print tolower(value)
      exit 0
    }
  '
}

extract_sprint_status_from_git_ref() {
  local ref="$1"
  local status_file="$2"
  local story_key="$3"
  local rel="$status_file"
  if [[ "$rel" == "$PWD/"* ]]; then
    rel="${rel#$PWD/}"
  fi
  if ! git cat-file -e "${ref}:${rel}" >/dev/null 2>&1; then
    return 1
  fi
  git show "${ref}:${rel}" | awk -v key="$story_key" '
    BEGIN { in_dev=0; found=0 }
    /^development_status:[[:space:]]*$/ { in_dev=1; next }
    in_dev && /^[^[:space:]]/ { in_dev=0 }
    in_dev {
      line=$0
      if (line ~ /^[[:space:]]{2}/) {
        sub(/^[[:space:]]{2}/, "", line)
        candidate=line
        sub(/:.*/, "", candidate)
        if (candidate == key) {
          value=line
          sub(/^[^:]+:[[:space:]]*/, "", value)
          gsub(/\r$/, "", value)
          print tolower(value)
          found=1
          exit 0
        }
      }
    }
    END {
      if (!found) {
        exit 1
      }
    }
  '
}

resolve_previous_ref() {
  local file="$1"
  local rel="$file"
  local event="${GITHUB_EVENT_NAME:-local}"
  local pr_current_ref=""
  local pr_previous_ref=""

  if [[ "$rel" == "$PWD/"* ]]; then
    rel="${rel#$PWD/}"
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo ""
    return 0
  fi

  if ! git rev-parse --verify --quiet HEAD >/dev/null 2>&1; then
    echo ""
    return 0
  fi

  if [[ "$event" == "pull_request" ]] && git rev-parse --verify --quiet HEAD^2 >/dev/null 2>&1; then
    pr_current_ref="HEAD^2"
    if git rev-parse --verify --quiet HEAD^2^ >/dev/null 2>&1; then
      pr_previous_ref="HEAD^2^"
    fi
  fi

  if git diff --quiet -- "$rel"; then
    if [[ -n "$pr_previous_ref" ]]; then
      echo "$pr_previous_ref"
      return 0
    fi

    if git rev-parse --verify --quiet HEAD^ >/dev/null 2>&1; then
      echo "HEAD^"
      return 0
    fi
    echo ""
    return 0
  fi

  if [[ -n "$pr_current_ref" ]]; then
    echo "$pr_current_ref"
    return 0
  fi

  echo "HEAD"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status-file)
      STATUS_FILE="${2:-}"
      shift 2
      ;;
    --stories-dir)
      STORIES_DIR="${2:-}"
      shift 2
      ;;
    --story-key)
      STORY_KEY="${2:-}"
      shift 2
      ;;
    --lane)
      LANE_OVERRIDE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$STORIES_DIR" ]]; then
  echo "Story status sync check failed: missing stories directory: $STORIES_DIR"
  exit 1
fi

branch_name="$(resolve_branch)"
lane_context_args=(--format shell --branch "$branch_name")
if [[ -n "$LANE_OVERRIDE" ]]; then
  lane_context_args+=(--lane "$LANE_OVERRIDE")
fi
if ! lane_context="$(node scripts/project-lane-context.js "${lane_context_args[@]}")"; then
  echo "Story status sync check failed: unable to resolve project lane context"
  exit 1
fi
eval "$lane_context"

expected_status_file="${SPRINT_STATUS_FILE:-$LANE_SPRINT_STATUS_FILE}"
if [[ -z "$STATUS_FILE" ]]; then
  STATUS_FILE="$expected_status_file"
fi

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "Story status sync check failed: missing sprint status file: $STATUS_FILE"
  exit 1
fi

status_file_abs="$(abs_path "$STATUS_FILE")"
expected_status_file_abs="$(abs_path "$expected_status_file")"
if [[ "$status_file_abs" != "$expected_status_file_abs" ]]; then
  echo "Story status sync check failed: lane-correct sprint status file mismatch."
  echo "Expected for lane '$ACTIVE_LANE': $expected_status_file"
  echo "Received: $STATUS_FILE"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
SPRINT_MAP_FILE="$TMP_DIR/sprint_story_status.tsv"
LANE_CATALOG_FILE="$TMP_DIR/lane_catalog.tsv"

while IFS=$'\t' read -r key value; do
  if is_valid_story_key "$key" && [[ -n "$value" ]]; then
    printf '%s\t%s\n' "$key" "$value" >> "$SPRINT_MAP_FILE"
  fi
done < <(
  awk '
    BEGIN { in_dev=0 }
    /^development_status:[[:space:]]*$/ { in_dev=1; next }
    in_dev && /^[^[:space:]]/ { in_dev=0 }
    in_dev && /^[[:space:]][[:space:]]/ {
      line=$0
      sub(/^[[:space:]][[:space:]]/, "", line)

      key=line
      sub(/:.*/, "", key)

      value=line
      sub(/^[^:]+:[[:space:]]*/, "", value)

      if (key != "" && value != "") {
        printf("%s\t%s\n", key, tolower(value))
      }
    }
  ' "$STATUS_FILE"
)

if [[ ! -s "$SPRINT_MAP_FILE" ]]; then
  echo "Story status sync check failed: no story entries found in development_status: $STATUS_FILE"
  exit 1
fi

node - <<'NODE' > "$LANE_CATALOG_FILE"
const fs = require('fs');
const path = require('path');
const configPath = path.join(process.cwd(), 'docs/policies/project_lanes.json');

try {
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  for (const lane of parsed.lanes || []) {
    if (!lane || !lane.id || !lane.sprintStatusFile) {
      continue;
    }
    const id = String(lane.id).trim().toLowerCase();
    const sprintStatusFile = String(lane.sprintStatusFile).trim().replace(/\\/g, '/').replace(/^\.\//, '');
    if (!id || !sprintStatusFile) {
      continue;
    }
    process.stdout.write(`${id}\t${sprintStatusFile}\n`);
  }
} catch (_error) {
  // best-effort, keep empty output
}
NODE

declare -a target_story_files=()
if [[ -n "$STORY_KEY" ]]; then
  target_story_files+=("$STORIES_DIR/$STORY_KEY.md")
else
  while IFS=$'\t' read -r sprint_key sprint_status_value; do
    [[ -n "$sprint_key" ]] || continue
    if is_valid_story_key "$sprint_key" && [[ "$sprint_status_value" =~ ^(ready-for-dev|in-progress|review|done)$ ]]; then
      target_story_files+=("$STORIES_DIR/$sprint_key.md")
    fi
  done < "$SPRINT_MAP_FILE"
fi

if [[ ${#target_story_files[@]} -eq 0 ]]; then
  echo "Story status sync check failed: no story files found in $STORIES_DIR"
  exit 1
fi

failures=0

sprint_status_for_key() {
  local key="$1"
  awk -F'\t' -v key="$key" '
    $1 == key {
      print $2
      found=1
      exit 0
    }
    END {
      if (!found) {
        exit 1
      }
    }
  ' "$SPRINT_MAP_FILE"
}

lane_matches_for_story() {
  local story_key="$1"
  while IFS=$'\t' read -r lane_id lane_status_file; do
    [[ -z "$lane_id" || -z "$lane_status_file" ]] && continue
    [[ ! -f "$lane_status_file" ]] && continue
    if grep -Eq "^[[:space:]]{2}${story_key}:[[:space:]]*" "$lane_status_file"; then
      printf '%s\t%s\n' "$lane_id" "$lane_status_file"
    fi
  done < "$LANE_CATALOG_FILE"
}

validate_closeout_transition() {
  local story_key="$1"
  local story_file="$2"
  local story_status="$3"
  local sprint_status="$4"

  if [[ "$story_status" != "review" && "$story_status" != "done" ]]; then
    return 0
  fi

  local story_prev_ref sprint_prev_ref previous_story_status previous_sprint_status
  story_prev_ref="$(resolve_previous_ref "$story_file")"
  sprint_prev_ref="$(resolve_previous_ref "$STATUS_FILE")"
  previous_story_status=""
  previous_sprint_status=""

  if [[ -n "$story_prev_ref" ]]; then
    previous_story_status="$(extract_story_status_from_git_ref "$story_prev_ref" "$story_file" || true)"
  fi
  if [[ -n "$sprint_prev_ref" ]]; then
    previous_sprint_status="$(extract_sprint_status_from_git_ref "$sprint_prev_ref" "$STATUS_FILE" "$story_key" || true)"
  fi

  if [[ -n "$previous_story_status" && "$previous_story_status" != "$story_status" ]]; then
    if ! is_valid_status "$previous_story_status"; then
      echo "Status sync mismatch: invalid prior story status '$previous_story_status' for closeout transition of '$story_key'"
      failures=$((failures + 1))
      return 0
    fi
    if ! is_allowed_transition "$previous_story_status" "$story_status" \
      && ! is_allowed_closeout_multihop "$previous_story_status" "$story_status"; then
      echo "Status sync mismatch: invalid closeout transition '$story_key' ${previous_story_status} -> ${story_status}; use npm run story:status:set"
      failures=$((failures + 1))
      return 0
    fi
  fi

  if [[ -n "$previous_sprint_status" && "$previous_sprint_status" != "$sprint_status" ]]; then
    if ! is_valid_status "$previous_sprint_status"; then
      echo "Status sync mismatch: invalid prior sprint status '$previous_sprint_status' for '$story_key'"
      failures=$((failures + 1))
      return 0
    fi
    if ! is_allowed_transition "$previous_sprint_status" "$sprint_status" \
      && ! is_allowed_closeout_multihop "$previous_sprint_status" "$sprint_status"; then
      echo "Status sync mismatch: invalid sprint closeout transition '$story_key' ${previous_sprint_status} -> ${sprint_status}; use npm run story:status:set"
      failures=$((failures + 1))
      return 0
    fi
  fi
}

for story_file in "${target_story_files[@]}"; do
  if [[ ! -f "$story_file" ]]; then
    continue
  fi

  story_key="$(basename "$story_file" .md)"

  lane_match_rows="$(lane_matches_for_story "$story_key" || true)"
  lane_match_count="$(printf '%s\n' "$lane_match_rows" | awk 'NF > 0 { c+=1 } END { print c+0 }')"
  if (( lane_match_count > 1 )); then
    echo "Status sync mismatch: story key '$story_key' appears in multiple lane sprint-status files."
    echo "$lane_match_rows" | awk -F'\t' 'NF == 2 { printf("  - lane=%s file=%s\n", $1, $2) }'
    failures=$((failures + 1))
    continue
  fi
  if (( lane_match_count == 1 )); then
    matched_status_file="$(printf '%s\n' "$lane_match_rows" | awk -F'\t' 'NF == 2 { print $2; exit }')"
    if [[ "$(abs_path "$matched_status_file")" != "$status_file_abs" ]]; then
      echo "Status sync mismatch: story '$story_key' belongs to lane sprint-status '$matched_status_file', not '$STATUS_FILE'"
      failures=$((failures + 1))
      continue
    fi
  fi

  story_status="$(extract_story_status_from_file "$story_file")"
  if [[ -z "$story_status" ]]; then
    echo "Status sync mismatch: missing 'Status:' line in $story_file"
    failures=$((failures + 1))
    continue
  fi
  if ! is_valid_status "$story_status"; then
    echo "Status sync mismatch: invalid story status '$story_status' in $story_file"
    failures=$((failures + 1))
    continue
  fi

  sprint_status="$(sprint_status_for_key "$story_key" || true)"
  if [[ -z "$sprint_status" ]]; then
    echo "Status sync mismatch: sprint-status missing key '$story_key' for $story_file"
    failures=$((failures + 1))
    continue
  fi
  if ! is_valid_status "$sprint_status"; then
    echo "Status sync mismatch: invalid sprint status '$sprint_status' for '$story_key' in $STATUS_FILE"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$story_status" != "$sprint_status" ]]; then
    echo "Status sync mismatch: $story_key story='$story_status' sprint='$sprint_status'"
    failures=$((failures + 1))
    continue
  fi

  validate_closeout_transition "$story_key" "$story_file" "$story_status" "$sprint_status"
done

while IFS=$'\t' read -r sprint_key status; do
  if [[ -n "$STORY_KEY" && "$sprint_key" != "$STORY_KEY" ]]; then
    continue
  fi

  if [[ "$status" =~ ^(ready-for-dev|in-progress|review|done)$ ]]; then
    expected_story_file="$STORIES_DIR/$sprint_key.md"
    if [[ ! -f "$expected_story_file" ]]; then
      echo "Status sync mismatch: sprint-status has '$sprint_key: $status' but story file is missing: $expected_story_file"
      failures=$((failures + 1))
    fi
  fi
done < "$SPRINT_MAP_FILE"

if [[ $failures -gt 0 ]]; then
  echo "Story status sync check failed with $failures mismatch(es)."
  exit 1
fi

echo "Story status sync check passed"
