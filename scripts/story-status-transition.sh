#!/usr/bin/env bash
set -euo pipefail

STATUS_FILE=""
STORIES_DIR="_bmad-output/implementation-artifacts"
STORY_KEY=""
STORY_FILE=""
TARGET_STATUS=""
LOCK_TIMEOUT_SECONDS=10
LANE_OVERRIDE=""

LOCK_DIR=""
TMP_DIR=""

usage() {
  cat <<'EOF'
Usage: bash scripts/story-status-transition.sh [options]

Required:
  --status <status>         Target status (backlog|ready-for-dev|in-progress|review|done)

Story selector (choose one):
  --story-key <key>         Story key (example: 1-5-policy-gate-and-branch-workflow-guard-enforcement)
  --story-file <path>       Story file path (example: _bmad-output/implementation-artifacts/1-5-foo.md)

Optional:
  --status-file <path>      Sprint status file override (default: resolved from lane context)
  --stories-dir <path>      Story file directory when --story-key is used
  --lane <lane-id>          Explicit lane override for sprint-status resolution
  --lock-timeout-seconds <n>  Lock wait timeout (default: 10)
  -h, --help                Show help

Examples:
  bash scripts/story-status-transition.sh \
    --story-key 1-5-policy-gate-and-branch-workflow-guard-enforcement \
    --status review

  bash scripts/story-status-transition.sh \
    --story-file _bmad-output/implementation-artifacts/a-5-capability-based-route-access-and-envelope-contract-compliance.md \
    --status done \
    --lane connectshyft
EOF
}

cleanup() {
  if [[ -n "$LOCK_DIR" && -d "$LOCK_DIR" ]]; then
    rmdir "$LOCK_DIR" >/dev/null 2>&1 || true
  fi
  if [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

fail() {
  echo "$1"
  exit "${2:-1}"
}

to_lower() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

is_valid_story_key() {
  local key="$1"
  [[ "$key" =~ ^([0-9]+|[A-Za-z])-[0-9]+-.+ ]]
}

is_valid_status() {
  local status="$1"
  [[ "$status" =~ ^(backlog|ready-for-dev|in-progress|review|done)$ ]]
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

resolve_branch() {
  local branch_name=""
  branch_name="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  if [[ -z "$branch_name" || "$branch_name" == "HEAD" ]]; then
    branch_name="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  fi
  if [[ -z "$branch_name" || "$branch_name" == "HEAD" ]]; then
    echo "detached"
    return 0
  fi
  echo "$branch_name"
}

extract_story_status() {
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

extract_sprint_status() {
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

update_story_status() {
  local source_file="$1"
  local target_file="$2"
  local status="$3"
  awk -v status="$status" '
    BEGIN { updated=0 }
    {
      if (!updated && $0 ~ /^Status:[[:space:]]*/) {
        print "Status: " status
        updated=1
        next
      }
      print $0
    }
    END {
      if (!updated) {
        exit 1
      }
    }
  ' "$source_file" > "$target_file"
}

update_sprint_status() {
  local source_file="$1"
  local target_file="$2"
  local story_key="$3"
  local status="$4"
  awk -v key="$story_key" -v status="$status" '
    BEGIN { in_dev=0; updated=0 }
    /^development_status:[[:space:]]*$/ {
      in_dev=1
      print $0
      next
    }
    in_dev && /^[^[:space:]]/ {
      in_dev=0
    }
    {
      if (in_dev) {
        line=$0
        stripped=line
        sub(/^[[:space:]]{2}/, "", stripped)
        candidate=stripped
        sub(/:.*/, "", candidate)
        if (line ~ /^[[:space:]]{2}/ && candidate == key) {
          print "  " key ": " status
          updated=1
          next
        }
      }
      print $0
    }
    END {
      if (!updated) {
        exit 1
      }
    }
  ' "$source_file" > "$target_file"
}

acquire_lock() {
  local lock_timeout="$1"
  local lock_key="$2"
  local start_epoch
  start_epoch="$(date +%s)"
  LOCK_DIR="${TMPDIR:-/tmp}/story-status-transition-${lock_key}.lock"

  while ! mkdir "$LOCK_DIR" >/dev/null 2>&1; do
    local now_epoch elapsed
    now_epoch="$(date +%s)"
    elapsed=$((now_epoch - start_epoch))
    if (( elapsed >= lock_timeout )); then
      fail "STATUS_TRANSITION_LOCK_TIMEOUT: could not acquire transition lock for '${STORY_KEY}' within ${lock_timeout}s" 73
    fi
    sleep 1
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status)
      TARGET_STATUS="${2:-}"
      shift 2
      ;;
    --story-key)
      STORY_KEY="${2:-}"
      shift 2
      ;;
    --story-file)
      STORY_FILE="${2:-}"
      shift 2
      ;;
    --status-file)
      STATUS_FILE="${2:-}"
      shift 2
      ;;
    --stories-dir)
      STORIES_DIR="${2:-}"
      shift 2
      ;;
    --lane)
      LANE_OVERRIDE="${2:-}"
      shift 2
      ;;
    --lock-timeout-seconds)
      LOCK_TIMEOUT_SECONDS="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

if [[ -z "$TARGET_STATUS" ]]; then
  fail "STATUS_TRANSITION_INPUT_INVALID: --status is required"
fi
TARGET_STATUS="$(to_lower "$TARGET_STATUS")"
if ! is_valid_status "$TARGET_STATUS"; then
  fail "STATUS_TRANSITION_INPUT_INVALID: unsupported target status '$TARGET_STATUS'"
fi

if [[ -n "$STORY_KEY" && -n "$STORY_FILE" ]]; then
  fail "STATUS_TRANSITION_INPUT_INVALID: provide either --story-key or --story-file, not both"
fi

if [[ -z "$STORY_KEY" && -z "$STORY_FILE" ]]; then
  fail "STATUS_TRANSITION_INPUT_INVALID: provide --story-key or --story-file"
fi

if [[ ! "$LOCK_TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || (( LOCK_TIMEOUT_SECONDS < 1 )); then
  fail "STATUS_TRANSITION_INPUT_INVALID: --lock-timeout-seconds must be an integer >= 1"
fi

if [[ -n "$STORY_FILE" ]]; then
  if [[ ! -f "$STORY_FILE" ]]; then
    fail "STATUS_TRANSITION_STORY_MISSING: story file not found: $STORY_FILE"
  fi
  STORY_KEY="$(basename "$STORY_FILE" .md)"
else
  if ! is_valid_story_key "$STORY_KEY"; then
    fail "STATUS_TRANSITION_INPUT_INVALID: invalid --story-key '$STORY_KEY'"
  fi
  STORY_FILE="${STORIES_DIR%/}/${STORY_KEY}.md"
  if [[ ! -f "$STORY_FILE" ]]; then
    fail "STATUS_TRANSITION_STORY_MISSING: story file not found: $STORY_FILE"
  fi
fi

if ! is_valid_story_key "$STORY_KEY"; then
  fail "STATUS_TRANSITION_INPUT_INVALID: story key '$STORY_KEY' is not a valid story identifier"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "STATUS_TRANSITION_REPO_INVALID: command must run inside a git repository"
fi

branch_name="$(resolve_branch)"
lane_context_args=(--format shell --branch "$branch_name")
if [[ -n "$LANE_OVERRIDE" ]]; then
  lane_context_args+=(--lane "$LANE_OVERRIDE")
fi

if ! lane_context="$(node scripts/project-lane-context.js "${lane_context_args[@]}")"; then
  fail "STATUS_TRANSITION_LANE_RESOLUTION_FAILED: unable to resolve project lane context"
fi
eval "$lane_context"

if [[ -z "$STATUS_FILE" ]]; then
  STATUS_FILE="${SPRINT_STATUS_FILE:-$LANE_SPRINT_STATUS_FILE}"
fi
if [[ ! -f "$STATUS_FILE" ]]; then
  fail "STATUS_TRANSITION_STATUS_FILE_MISSING: sprint status file not found: $STATUS_FILE"
fi

TMP_DIR="$(mktemp -d)"
acquire_lock "$LOCK_TIMEOUT_SECONDS" "$STORY_KEY"

story_status="$(extract_story_status "$STORY_FILE")"
if [[ -z "$story_status" ]]; then
  fail "STATUS_TRANSITION_STORY_STATUS_MISSING: missing 'Status:' line in $STORY_FILE"
fi
if ! is_valid_status "$story_status"; then
  fail "STATUS_TRANSITION_STORY_STATUS_INVALID: unsupported current story status '$story_status' in $STORY_FILE"
fi

sprint_status="$(extract_sprint_status "$STATUS_FILE" "$STORY_KEY" || true)"
if [[ -z "$sprint_status" ]]; then
  fail "STATUS_TRANSITION_SPRINT_STATUS_MISSING: story key '$STORY_KEY' is missing in development_status at $STATUS_FILE"
fi
if ! is_valid_status "$sprint_status"; then
  fail "STATUS_TRANSITION_SPRINT_STATUS_INVALID: unsupported sprint status '$sprint_status' for '$STORY_KEY' in $STATUS_FILE"
fi

if [[ "$story_status" != "$sprint_status" ]]; then
  fail "STATUS_TRANSITION_CONFLICT: story and sprint statuses are out of sync before transition (story='$story_status', sprint='$sprint_status')"
fi

if [[ "$story_status" == "$TARGET_STATUS" ]]; then
  fail "STATUS_TRANSITION_CONFLICT: story '$STORY_KEY' is already '$TARGET_STATUS'"
fi

if ! is_allowed_transition "$story_status" "$TARGET_STATUS"; then
  fail "STATUS_TRANSITION_INVALID: transition '${story_status}' -> '${TARGET_STATUS}' is not allowed"
fi

story_next_file="$TMP_DIR/story-next.md"
sprint_next_file="$TMP_DIR/sprint-next.yaml"
story_backup_file="$TMP_DIR/story-backup.md"
sprint_backup_file="$TMP_DIR/sprint-backup.yaml"
cp "$STORY_FILE" "$story_backup_file"
cp "$STATUS_FILE" "$sprint_backup_file"

if ! update_story_status "$STORY_FILE" "$story_next_file" "$TARGET_STATUS"; then
  fail "STATUS_TRANSITION_WRITE_FAILED: unable to update story status in $STORY_FILE"
fi

if ! update_sprint_status "$STATUS_FILE" "$sprint_next_file" "$STORY_KEY" "$TARGET_STATUS"; then
  fail "STATUS_TRANSITION_WRITE_FAILED: unable to update sprint status entry '$STORY_KEY' in $STATUS_FILE"
fi

if ! mv "$story_next_file" "$STORY_FILE"; then
  fail "STATUS_TRANSITION_WRITE_FAILED: unable to persist story file update for $STORY_FILE"
fi

if ! mv "$sprint_next_file" "$STATUS_FILE"; then
  cp "$story_backup_file" "$STORY_FILE"
  fail "STATUS_TRANSITION_PARTIAL_WRITE_RECOVERED: sprint status update failed; rolled back story file to previous state"
fi

echo "STATUS_TRANSITION_OK: ${STORY_KEY} ${story_status} -> ${TARGET_STATUS}"
echo "Story file: ${STORY_FILE}"
echo "Sprint status file: ${STATUS_FILE}"
