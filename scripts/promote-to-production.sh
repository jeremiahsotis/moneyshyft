#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXCLUDE_FILE="$ROOT_DIR/.production-excludes"
SOURCE_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
TARGET_BRANCH="production"
SOURCE_REQUIRED_BRANCH="codex/dev"
MESSAGE="${1:-Chore: promote from ${SOURCE_BRANCH}}"

if [[ ! -f "$EXCLUDE_FILE" ]]; then
  echo "Missing exclude file: $EXCLUDE_FILE"
  exit 1
fi

if [[ "$SOURCE_BRANCH" == "$TARGET_BRANCH" ]]; then
  echo "Run promotion from a non-production branch"
  exit 1
fi

if [[ "$SOURCE_BRANCH" != "$SOURCE_REQUIRED_BRANCH" ]]; then
  echo "Promotion must run from '$SOURCE_REQUIRED_BRANCH'. Current branch: '$SOURCE_BRANCH'"
  exit 1
fi

if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
  echo "Working tree must be clean before promotion"
  exit 1
fi

if ! git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
  echo "Target branch '$TARGET_BRANCH' does not exist locally"
  exit 1
fi

tmp_dir="$(mktemp -d /tmp/moneyshyft-production.XXXXXX)"
cleanup() {
  git -C "$ROOT_DIR" worktree remove --force "$tmp_dir" >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

git -C "$ROOT_DIR" worktree add --force "$tmp_dir" "$TARGET_BRANCH" >/dev/null

rsync -a --delete \
  --exclude '.git' \
  --exclude '.git/' \
  "$ROOT_DIR/" "$tmp_dir/"

while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  rm -rf "$tmp_dir/$line"
done < "$EXCLUDE_FILE"

# Ensure dev-only caches are not promoted.
rm -rf "$tmp_dir/tests/artifacts"

git -C "$tmp_dir" add -A
if git -C "$tmp_dir" diff --cached --quiet; then
  echo "No production changes to commit"
  exit 0
fi

git -C "$tmp_dir" commit -m "$MESSAGE"
echo "Promotion commit created on '$TARGET_BRANCH': $MESSAGE"
