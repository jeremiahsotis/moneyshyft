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
phase0_status_file="${PHASE0_READINESS_STATUS_FILE:-_bmad-output/implementation-artifacts/phase0-readiness.json}"
readiness_api_spec="${PHASE0_READINESS_API_SPEC:-tests/api/platform/kernel-readiness-verification-suite.api.spec.ts}"

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

is_phase0_readiness_complete() {
  local file_path="$1"

  if [[ ! -f "$file_path" ]]; then
    return 1
  fi

  node -e '
const fs = require("fs");
const filePath = process.argv[1];
try {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (payload && payload.phase0Status === "complete") {
    process.exit(0);
  }
} catch (_error) {
  // treated as incomplete
}
process.exit(1);
' "$file_path"
}

requires_phase0_readiness() {
  local normalized_story_id="$1"
  local epic_number="${normalized_story_id%%-*}"

  if [[ ! "$epic_number" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  [[ "$epic_number" -gt 0 ]]
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

  if [[ ! "$branch" =~ ^codex/story-${story_id}- ]]; then
    echo "Branch guard failed"
    echo "Workflow key: $workflow_key"
    echo "Expected branch pattern: codex/story-${story_id}-<slug>"
    echo "Current branch: $branch"
    exit 1
  fi

  if requires_phase0_readiness "$story_id"; then
    if ! is_phase0_readiness_complete "$phase0_status_file"; then
      echo "Phase-0 readiness incomplete"
      echo "Complete Story 0.10 kernel readiness verification suite first"
      echo "Readiness status file: $phase0_status_file"
      echo "Run: npm run test:e2e -- $readiness_api_spec"
      echo "Run: npm run branch:ensure-workflow -- --workflow $workflow --story $story_input"
      exit 1
    fi

    echo "Phase-0 readiness verified"
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
