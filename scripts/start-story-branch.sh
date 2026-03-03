#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--allow-dirty] [--lane <lane-id>] <story-id> <slug>"
  echo "Example: $0 0-1 canonical-app-entrypoint-and-platform-middleware-chain"
  echo "Example: $0 a-1 connectshyft-feature-flag-and-availability-guardrails"
  echo "Example: $0 --lane connectshyft 1-1 admin-user-creation-ui"
  echo "Example: $0 --allow-dirty 0-1 canonical-app-entrypoint-and-platform-middleware-chain"
}

resolve_lane_context() {
  local branch_name="${1:-detached}"
  local lane_arg="${2:-}"
  local lane_context_args=(--format shell --branch "$branch_name")
  if [[ -n "$lane_arg" ]]; then
    lane_context_args+=(--lane "$lane_arg")
  fi
  node scripts/project-lane-context.js "${lane_context_args[@]}"
}

load_lane_catalog() {
  node - <<'NODE'
const fs = require('fs');
const configPath = 'docs/policies/project_lanes.json';
try {
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  for (const lane of parsed.lanes || []) {
    if (!lane || !lane.id || !lane.sprintStatusFile) {
      continue;
    }
    const id = String(lane.id).trim().toLowerCase();
    const statusPath = String(lane.sprintStatusFile)
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\.\//, '');
    if (!id || !statusPath) {
      continue;
    }
    process.stdout.write(`${id}\t${statusPath}\n`);
  }
} catch (_error) {
  // No-op fallback. Caller handles empty output.
}
NODE
}

allow_dirty=false
lane_override=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-dirty)
      allow_dirty=true
      shift
      ;;
    --lane)
      if [[ $# -lt 2 || -z "${2-}" || "${2-}" == --* ]]; then
        echo "Missing value for --lane"
        exit 1
      fi
      lane_override="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

story_id="$1"
shift
slug_raw="$*"

if [[ "$story_id" =~ ^([0-9]+|[A-Za-z])-([0-9]+)$ ]]; then
  epic_token="${BASH_REMATCH[1]}"
  story_number="${BASH_REMATCH[2]}"
  if [[ "$epic_token" =~ ^[A-Za-z]$ ]]; then
    epic_token="$(echo "$epic_token" | tr '[:upper:]' '[:lower:]')"
  fi
  story_id="${epic_token}-${story_number}"
elif [[ "$story_id" =~ ^([A-Za-z]+)-([Rr][0-9]+)$ ]]; then
  epic_token="${BASH_REMATCH[1]}"
  story_token="${BASH_REMATCH[2]}"
  epic_token="$(echo "$epic_token" | tr '[:upper:]' '[:lower:]')"
  story_token="$(echo "$story_token" | tr '[:upper:]' '[:lower:]')"
  story_id="${epic_token}-${story_token}"
else
  echo "Invalid story id '$story_id'. Expected format: <epic>-<story> where <epic> is numeric/letter and story is numeric or r<number> (e.g. 0-1, a-1, ux-r3)"
  exit 1
fi

epic_id="${story_id%%-*}"
current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

slug="$(echo "$slug_raw" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')"

if [[ -z "$slug" ]]; then
  echo "Slug cannot be empty after normalization"
  exit 1
fi

if ! lane_context="$(resolve_lane_context "${current_branch:-detached}" "$lane_override")"; then
  exit 1
fi
eval "$lane_context"

story_key="${story_id}-${slug}"
lane_catalog="$(load_lane_catalog)"
lane_count="$(printf '%s\n' "$lane_catalog" | awk 'NF > 0 { count += 1 } END { print count + 0 }')"
detected_story_lane=""
declare -a story_lane_matches=()

if [[ -n "$lane_catalog" ]]; then
  while IFS=$'\t' read -r lane_id lane_status_file; do
    [[ -z "$lane_id" || -z "$lane_status_file" ]] && continue
    [[ ! -f "$lane_status_file" ]] && continue
    if grep -Eq "^[[:space:]]{2}${story_key}:[[:space:]]*" "$lane_status_file"; then
      story_lane_matches+=("$lane_id")
    fi
  done <<< "$lane_catalog"
fi

if [[ "${#story_lane_matches[@]}" -gt 1 ]]; then
  echo "Lane resolution is ambiguous for story key '$story_key'."
  echo "Story key appears in multiple lane status files: ${story_lane_matches[*]}"
  echo "Retry with explicit lane:"
  echo "  npm run start:story-branch -- --lane <lane-id> $story_id $slug_raw"
  exit 1
fi

if [[ "${#story_lane_matches[@]}" -eq 1 ]]; then
  detected_story_lane="${story_lane_matches[0]}"
fi

if [[ -z "$lane_override" && -z "${PROJECT_LANE:-}" && "${LANE_SOURCE:-}" == "default" ]]; then
  if [[ -n "$detected_story_lane" && "$detected_story_lane" != "$ACTIVE_LANE" ]]; then
    lane_override="$detected_story_lane"
    if ! lane_context="$(resolve_lane_context "${current_branch:-detached}" "$lane_override")"; then
      exit 1
    fi
    eval "$lane_context"
  elif [[ -z "$detected_story_lane" && "$lane_count" -gt 1 ]]; then
    echo "Lane resolution is ambiguous (fell back to default lane '$ACTIVE_LANE')."
    echo "No lane could be inferred from branch/env or story key '$story_key'."
    echo "Retry with explicit lane:"
    echo "  npm run start:story-branch -- --lane <lane-id> $story_id $slug_raw"
    exit 1
  fi
fi

status_file="${SPRINT_STATUS_FILE:-$LANE_SPRINT_STATUS_FILE}"

if [[ "$epic_id" =~ ^[0-9]+$ && "$epic_id" != "0" ]]; then
  if [[ ! -f "$status_file" ]]; then
    echo "Kernel gate failed: missing $status_file"
    exit 1
  fi

  if ! grep -Eq '0-10-kernel-readiness-verification-suite:\s*done' "$status_file"; then
    echo "Kernel gate failed: Story 0-10 is not done. Cannot start feature story branch $story_id yet."
    exit 1
  fi

  if ! awk '
    /cc-2026-02-18:/ { in_block=1; next }
    in_block && /^[^[:space:]]/ { in_block=0 }
    in_block && /status:[[:space:]]*approved/ { ok=1 }
    END { exit ok ? 0 : 1 }
  ' "$status_file"; then
    echo "Kernel gate failed: course correction cc-2026-02-18 is not approved."
    exit 1
  fi
fi

if [[ "-$slug-" != *-"$LANE_SLUG_TOKEN"-* ]]; then
  slug="${LANE_SLUG_TOKEN}-${slug}"
fi

branch="codex/story-${story_id}-${slug}"

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "$allow_dirty" == "false" ]]; then
    echo "Working tree is not clean. Commit or stash changes before creating a new story branch."
    echo "Tip: pass --allow-dirty to create the story branch from current HEAD without checkout/pull."
    exit 1
  fi
fi

if git show-ref --verify --quiet "refs/heads/${branch}"; then
  echo "Branch already exists locally: ${branch}"
  echo "Checkout it directly: git checkout ${branch}"
  exit 1
fi

if [[ "$allow_dirty" == "true" ]]; then
  current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  if [[ -z "$current_branch" ]]; then
    echo "Cannot create branch from detached HEAD in --allow-dirty mode."
    exit 1
  fi
  if [[ "$current_branch" != "codex/dev" ]]; then
    echo "Warning: --allow-dirty is creating story branch from '${current_branch}', not codex/dev."
  fi
else
  git fetch origin codex/dev
  git checkout codex/dev
  git pull --ff-only origin codex/dev
fi

git checkout -b "$branch"
git config "branch.${branch}.gh-merge-base" "codex/dev"

echo "Created branch: $branch"
echo "PR base default set to: codex/dev"
