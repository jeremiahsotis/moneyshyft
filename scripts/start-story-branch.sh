#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <story-id> <slug>"
  echo "Example: $0 0-1 canonical-app-entrypoint-and-platform-middleware-chain"
}

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
  echo "Working tree is not clean. Commit or stash changes before creating a new story branch."
  exit 1
fi

git fetch origin codex/dev
git checkout codex/dev
git pull --ff-only origin codex/dev
git checkout -b "$branch"
git config "branch.${branch}.gh-merge-base" "codex/dev"

echo "Created branch: $branch"
echo "PR base default set to: codex/dev"
