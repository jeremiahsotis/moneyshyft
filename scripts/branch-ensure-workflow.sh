#!/usr/bin/env bash
set -euo pipefail

workflow=""
story_input=""
epic_input=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workflow)
      workflow="$2"
      shift 2
      ;;
    --story)
      story_input="$2"
      shift 2
      ;;
    --epic)
      epic_input="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$workflow" ]]; then
  echo "Missing required argument: --workflow"
  exit 1
fi

normalize_workflow_key() {
  local raw="$1"
  local lower
  local base
  local dir

  lower="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"

  # Common short aliases should continue working directly.
  case "$lower" in
    at|ta|ds|cr|ci|nr|rv|tf|tr|tmt|automate|atdd|create-story|dev-story|code-review|sprint-planning|retrospective|correct-course)
      echo "$lower"
      return 0
      ;;
  esac

  base="$(basename "$lower")"

  # If caller passed a workflow file path, use the parent folder as the key.
  if [[ "$base" =~ ^workflow\.(yaml|yml|md|xml)$ ]]; then
    dir="$(basename "$(dirname "$lower")")"
    echo "$dir"
    return 0
  fi

  # Otherwise strip known extensions and use filename.
  base="${base%.yaml}"
  base="${base%.yml}"
  base="${base%.md}"
  base="${base%.xml}"

  echo "$base"
}

workflow_key="$(normalize_workflow_key "$workflow")"

branch="${GITHUB_HEAD_REF:-$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)}"
if [[ -z "$branch" ]]; then
  branch="${GITHUB_REF_NAME:-detached}"
fi

story_workflow_regex='^(atdd|automate|create-story|dev-story|code-review|at|ta|ds|cr)$'
epic_workflow_regex='^(sprint-planning|retrospective|correct-course)$'

normalize_story_id() {
  local raw="$1"
  raw="$(basename "$raw")"
  if [[ "$raw" =~ ^([0-9]+-[0-9]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  if [[ "$raw" =~ ^([0-9]+\.[0-9]+) ]]; then
    echo "${BASH_REMATCH[1]//./-}"
    return 0
  fi
  if [[ "$raw" =~ ^([0-9]+-[0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  echo ""
}

ensure_corrected_kernel_gate() {
  local story_id="$1"
  local epic_id="${story_id%%-*}"
  local status_file="_bmad-output/implementation-artifacts/sprint-status.yaml"

  if [[ "$epic_id" == "0" ]]; then
    return 0
  fi

  if [[ ! -f "$status_file" ]]; then
    echo "Kernel gate failed: missing $status_file"
    exit 1
  fi

  if ! grep -Eq '0-10-kernel-readiness-verification-suite:\s*done' "$status_file"; then
    echo "Kernel gate failed: Story 0-10 is not done. Feature story workflows are blocked until corrected kernel acceptance criteria are complete."
    exit 1
  fi

  if ! awk '
    /cc-2026-02-18:/ { in_block=1; next }
    in_block && /^[^[:space:]]/ { in_block=0 }
    in_block && /status:[[:space:]]*approved/ { ok=1 }
    END { exit ok ? 0 : 1 }
  ' "$status_file"; then
    echo "Kernel gate failed: course correction cc-2026-02-18 is not approved in sprint status."
    exit 1
  fi
}

if [[ "$workflow_key" =~ $story_workflow_regex ]]; then
  if [[ -z "$story_input" ]]; then
    echo "Story workflow requires --story"
    exit 1
  fi

  story_id="$(normalize_story_id "$story_input")"
  if [[ -z "$story_id" ]]; then
    echo "Could not parse story id from: $story_input"
    exit 1
  fi

  ensure_corrected_kernel_gate "$story_id"

  if [[ ! "$branch" =~ ^codex/story-${story_id}- ]]; then
    echo "Branch guard failed"
    echo "Workflow key: $workflow_key"
    echo "Expected branch pattern: codex/story-${story_id}-<slug>"
    echo "Current branch: $branch"
    exit 1
  fi

  echo "Branch guard passed for story workflow"
  exit 0
fi

if [[ "$workflow_key" =~ $epic_workflow_regex ]]; then
  if [[ -z "$epic_input" ]]; then
    echo "Epic workflow requires --epic"
    exit 1
  fi

  if [[ ! "$epic_input" =~ ^[0-9]+$ ]]; then
    echo "Epic value must be numeric. Actual: $epic_input"
    exit 1
  fi

  if [[ ! "$branch" =~ ^codex/epic-${epic_input}-ops$ ]]; then
    echo "Branch guard failed"
    echo "Workflow key: $workflow_key"
    echo "Expected branch: codex/epic-${epic_input}-ops"
    echo "Current branch: $branch"
    exit 1
  fi

  echo "Branch guard passed for epic workflow"
  exit 0
fi

echo "No branch rule for workflow '$workflow'; guard passed"
