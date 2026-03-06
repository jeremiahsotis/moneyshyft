#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_ROOT="_bmad-output/test-artifacts"

is_allowed_artifact_path() {
  local path="$1"

  case "$path" in
    "${ARTIFACT_ROOT}/.gitignore")
      return 0
      ;;
    "${ARTIFACT_ROOT}/automation-summary.md")
      return 0
      ;;
    "${ARTIFACT_ROOT}/ci-pipeline-progress.md")
      return 0
      ;;
    "${ARTIFACT_ROOT}/test-design-"*.md)
      return 0
      ;;
    "${ARTIFACT_ROOT}/test-design-progress"*.md)
      return 0
      ;;
    "${ARTIFACT_ROOT}/test-review"*.md)
      return 0
      ;;
    "${ARTIFACT_ROOT}/traceability"*.md)
      return 0
      ;;
    "${ARTIFACT_ROOT}/framework-"*.md)
      return 0
      ;;
    "${ARTIFACT_ROOT}/atdd-checklist-"*.md)
      return 0
      ;;
    "${ARTIFACT_ROOT}/epic-f-"*)
      return 0
      ;;
    "${ARTIFACT_ROOT}/release-evidence/"*)
      return 0
      ;;
  esac

  return 1
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Test artifact allowlist guard skipped: not in a git repository."
  exit 0
fi

staged_files=()
while IFS= read -r file; do
  [[ -n "$file" ]] && staged_files+=("$file")
done < <(git diff --cached --name-only --diff-filter=AM -- "$ARTIFACT_ROOT")

if [[ "${#staged_files[@]}" -eq 0 ]]; then
  echo "Test artifact allowlist guard passed: no staged test-artifact additions/modifications."
  exit 0
fi

violations=()
for file in "${staged_files[@]}"; do
  if ! is_allowed_artifact_path "$file"; then
    violations+=("$file")
  fi
done

if [[ "${#violations[@]}" -gt 0 ]]; then
  echo "Test artifact allowlist guard failed: staged test artifacts outside allowlist."
  echo "Allowed tracked patterns:"
  echo "  - ${ARTIFACT_ROOT}/automation-summary.md"
  echo "  - ${ARTIFACT_ROOT}/ci-pipeline-progress.md"
  echo "  - ${ARTIFACT_ROOT}/test-design-*.md"
  echo "  - ${ARTIFACT_ROOT}/test-design-progress*.md"
  echo "  - ${ARTIFACT_ROOT}/test-review*.md"
  echo "  - ${ARTIFACT_ROOT}/traceability*.md"
  echo "  - ${ARTIFACT_ROOT}/framework-*.md"
  echo "  - ${ARTIFACT_ROOT}/atdd-checklist-*.md"
  echo "  - ${ARTIFACT_ROOT}/epic-f-*"
  echo "  - ${ARTIFACT_ROOT}/release-evidence/**"
  echo "  - ${ARTIFACT_ROOT}/.gitignore"
  echo
  echo "Violations:"
  for file in "${violations[@]}"; do
    echo "  - $file"
  done
  echo
  echo "Remediation:"
  echo "  - Move non-durable outputs to ignored folders (automation-runs/, automation-temp/, atdd-temp/, exploration/, test-review-temp/), or"
  echo "  - Update policy and allowlist deliberately if a new durable artifact class is required."
  exit 1
fi

echo "Test artifact allowlist guard passed."
