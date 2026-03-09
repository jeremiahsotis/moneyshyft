#!/usr/bin/env bash
set -euo pipefail

NEXT_TASK="$(./scripts/next-task.sh)"
if [[ -z "$NEXT_TASK" || "$NEXT_TASK" == "No unchecked tasks found." ]]; then
  echo "$NEXT_TASK"
  exit 0
fi

./scripts/prompt-from-task.sh "$NEXT_TASK" | pbcopy
echo "Copied prompt for $NEXT_TASK to clipboard."
