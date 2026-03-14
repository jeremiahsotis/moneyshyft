#!/usr/bin/env bash
set -euo pipefail

TASKS_FILE="specs/001-tighten-deployment-contracts/tasks.md"
if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Missing $TASKS_FILE"
  exit 1
fi

NEXT_TASK="$(grep -E '^- \[ \] T[0-9]+' "$TASKS_FILE" | head -n 1 | sed -E 's/^- \[ \] (T[0-9]+).*/\1/')"

if [[ -z "$NEXT_TASK" ]]; then
  echo "No unchecked tasks found."
  exit 0
fi

echo "$NEXT_TASK"
