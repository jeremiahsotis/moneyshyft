#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--allow-dirty] <story-id> <slug>"
  echo "Example: $0 0-1 canonical-app-entrypoint-and-platform-middleware-chain"
  echo "Example: $0 --allow-dirty 0-1 canonical-app-entrypoint-and-platform-middleware-chain"
}

allow_dirty=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-dirty)
      allow_dirty=true
      shift
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

if [[ ! "$story_id" =~ ^[0-9]+-[0-9]+$ ]]; then
  echo "Invalid story id '$story_id'. Expected format: <epic>-<story> (e.g. 0-1)"
  exit 1
fi

slug="$(echo "$slug_raw" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')"

if [[ -z "$slug" ]]; then
  echo "Slug cannot be empty after normalization"
  exit 1
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
