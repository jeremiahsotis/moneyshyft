#!/usr/bin/env bash
set -euo pipefail

STORY_FILE=""
BASE_REF="codex/dev"

usage() {
  cat <<'EOF'
Usage: bash scripts/enforce-story-artifact-hygiene.sh [options]

Options:
  --story-file <path>  Story markdown file to validate (required)
  --base-ref <ref>     Git ref used to detect committed story changes (default: codex/dev)
  -h, --help           Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --story-file)
      STORY_FILE="${2:-}"
      shift 2
      ;;
    --base-ref)
      BASE_REF="${2:-}"
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

if [[ -z "$STORY_FILE" ]]; then
  echo "Story artifact hygiene check failed: --story-file is required."
  exit 1
fi

if [[ ! -f "$STORY_FILE" ]]; then
  echo "Story artifact hygiene check failed: story file not found: $STORY_FILE"
  exit 1
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

file_list_entries_file="$tmp_dir/file-list.txt"
debug_refs_file="$tmp_dir/debug-refs.txt"
changed_candidates_file="$tmp_dir/changed-candidates.txt"
changed_required_file="$tmp_dir/changed-required.txt"
ignored_scope_markers_file="$tmp_dir/ignored-scope-markers.txt"

awk '
  BEGIN { in_file_list=0 }
  /^### File List$/ { in_file_list=1; next }
  /^### / && in_file_list { exit }
  in_file_list && /^[[:space:]]*-[[:space:]]+/ {
    line=$0
    sub(/^[[:space:]]*-[[:space:]]+/, "", line)
    gsub(/^`|`$/, "", line)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
    if (line != "") {
      print line
    }
  }
' "$STORY_FILE" > "$file_list_entries_file"

if [[ ! -s "$file_list_entries_file" ]]; then
  echo "Story artifact hygiene check failed: '### File List' is missing or empty in $STORY_FILE"
  exit 1
fi

awk '
  BEGIN { in_debug=0 }
  /^### Debug Log References$/ { in_debug=1; next }
  /^### / && in_debug { exit }
  in_debug && /^[[:space:]]*-[[:space:]]+/ {
    print $0
  }
' "$STORY_FILE" > "$debug_refs_file"

contains_pass_marker() {
  if command -v rg >/dev/null 2>&1; then
    rg -q '\(pass' "$debug_refs_file"
    return $?
  fi

  grep -Eq '\(pass' "$debug_refs_file"
}

if ! contains_pass_marker; then
  echo "Story artifact hygiene check failed: Debug Log References must include passing command results in $STORY_FILE"
  exit 1
fi

resolved_base_ref=""
if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  resolved_base_ref="$BASE_REF"
elif git rev-parse --verify "origin/$BASE_REF" >/dev/null 2>&1; then
  resolved_base_ref="origin/$BASE_REF"
fi

if [[ -n "$resolved_base_ref" ]]; then
  merge_base="$(git merge-base HEAD "$resolved_base_ref" 2>/dev/null || true)"
  if [[ -n "$merge_base" ]]; then
    git diff --name-only "${merge_base}...HEAD" > "$changed_candidates_file"
  fi
fi

git diff --name-only >> "$changed_candidates_file"
git diff --cached --name-only >> "$changed_candidates_file"
git ls-files --others --exclude-standard >> "$changed_candidates_file"

# Git does not include ignored directories in `git ls-files --others --exclude-standard`,
# but story auditability still requires explicit node_modules scope markers when present.
git status --short --ignored=matching --untracked-files=all 2>/dev/null | awk '
  $1 == "!!" {
    path=$2
    sub(/\/$/, "", path)
    if (path ~ /^apps\/[^\/]+\/node_modules$/) {
      print path
    }
  }
' > "$ignored_scope_markers_file"

if [[ -s "$ignored_scope_markers_file" ]]; then
  cat "$ignored_scope_markers_file" >> "$changed_candidates_file"
fi

sort -u "$changed_candidates_file" \
  | grep -E '^(apps/moneyshyft-api/|apps/moneyshyft-web/|tests/|_bmad-output/test-artifacts/epic-f-[^[:space:]]+|apps/[^/]+/node_modules$)' \
  > "$changed_required_file" || true

if [[ ! -s "$changed_required_file" ]]; then
  echo "Story artifact hygiene check passed (no story deltas detected in enforced hygiene scope)."
  exit 0
fi

missing_file_list_entries=0
while IFS= read -r changed_path; do
  [[ -n "$changed_path" ]] || continue

  if ! awk -v path="$changed_path" '
    {
      entry=$0
      gsub(/^\.\/+/, "", entry)
      if (entry == path) {
        found=1
        exit 0
      }
    }
    END { exit found ? 0 : 1 }
  ' "$file_list_entries_file"; then
    echo "Story artifact hygiene mismatch: changed file missing from File List -> $changed_path"
    missing_file_list_entries=$((missing_file_list_entries + 1))
  fi
done < "$changed_required_file"

if [[ $missing_file_list_entries -gt 0 ]]; then
  echo "Story artifact hygiene check failed: $missing_file_list_entries changed file(s) in enforced hygiene scope are missing from File List."
  exit 1
fi

echo "Story artifact hygiene check passed."
