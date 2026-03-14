#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${1:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "Usage: ./scripts/prompt-from-task.sh T015"
  exit 1
fi

TASKS_FILE="specs/001-tighten-deployment-contracts/tasks.md"
PLAYBOOK="architecture/contracts/issue_execution_playbook.md"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Missing $TASKS_FILE"
  exit 1
fi

LINE="$(grep -E "^- \[[ x]\] ${TASK_ID}\b" "$TASKS_FILE" || true)"
if [[ -z "$LINE" ]]; then
  echo "Task $TASK_ID not found in $TASKS_FILE"
  exit 1
fi

DESC="$(echo "$LINE" | sed -E "s/^- \[[ x]\] ${TASK_ID}( \[P\])?( \[[A-Z0-9]+\])? //; s/ in \`.*$//")"
TARGET="$(echo "$LINE" | sed -nE 's/.* in `([^`]+)`/\1/p')"
TARGET="${TARGET#/Users/jeremiahotis/projects/connectshyft/}"

ISSUE_NUMBER=""
case "$TASK_ID" in
  T001) ISSUE_NUMBER="72" ;;
  T002) ISSUE_NUMBER="73" ;;
  T003) ISSUE_NUMBER="74" ;;
  T004) ISSUE_NUMBER="75" ;;
  T005) ISSUE_NUMBER="76" ;;
  T006) ISSUE_NUMBER="77" ;;
  T007) ISSUE_NUMBER="78" ;;
  T008) ISSUE_NUMBER="79" ;;
  T009) ISSUE_NUMBER="80" ;;
  T010) ISSUE_NUMBER="81" ;;
  T011) ISSUE_NUMBER="82" ;;
  T012) ISSUE_NUMBER="83" ;;
  T013) ISSUE_NUMBER="84" ;;
  T014) ISSUE_NUMBER="85" ;;
  T015) ISSUE_NUMBER="86" ;;
  T016) ISSUE_NUMBER="87" ;;
  T017) ISSUE_NUMBER="88" ;;
  T018) ISSUE_NUMBER="89" ;;
  T019) ISSUE_NUMBER="90" ;;
  T020) ISSUE_NUMBER="91" ;;
  T021) ISSUE_NUMBER="92" ;;
  T022) ISSUE_NUMBER="93" ;;
  T023) ISSUE_NUMBER="94" ;;
  T024) ISSUE_NUMBER="95" ;;
  T025) ISSUE_NUMBER="96" ;;
  T026) ISSUE_NUMBER="97" ;;
  T027) ISSUE_NUMBER="98" ;;
  T028) ISSUE_NUMBER="99" ;;
  T029) ISSUE_NUMBER="100" ;;
  T030) ISSUE_NUMBER="101" ;;
  T031) ISSUE_NUMBER="102" ;;
  T032) ISSUE_NUMBER="103" ;;
esac

if [[ -z "$ISSUE_NUMBER" ]]; then
  echo "No issue number mapped for $TASK_ID"
  exit 1
fi

SHORT_NAME="$(echo "$DESC" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' | cut -c1-42)"
TYPE="docs"
if [[ "$TARGET" == *.yml || "$TARGET" == *.yaml || "$TARGET" == *.conf || "$TARGET" == *Dockerfile* || "$TARGET" == *.env.example ]]; then
  TYPE="chore"
fi

cat <<PROMPT
Implement Issue #${ISSUE_NUMBER} in the connectshyft repository using:
${PLAYBOOK}

Task ID: ${TASK_ID}
Task: ${DESC}
Target file: ${TARGET}

File Inspection Rule

Before making changes:
1. Open and read the existing target file.
2. Base all modifications on the current file contents.
3. Do not reconstruct the file from the prompt.
4. Preserve all existing configuration unless it conflicts with the task.

Editing Rule

Apply a surgical edit.
- Modify only the sections required for this task.
- Preserve document structure and ordering.
- Do not rewrite unrelated sections.

Structured Config Rule

If the target file is a structured configuration file:
- Output the complete file after modification.
- Do not output partial patches or snippets.
- Preserve indentation and structure.
- Do not introduce new top-level keys unless required by the task.
- Mentally validate the configuration before output.

Task Completion Update (Required)

After completing the task, update:
specs/001-tighten-deployment-contracts/tasks.md

Find the line for ${TASK_ID} and change the checkbox from:
[ ]
to:
[x]

Do not modify any other task lines.

Git Workflow

Create branch:
git checkout -b issue-${ISSUE_NUMBER}-${SHORT_NAME}

Commit message:
${TYPE}(spec-001): ${DESC}

Refs #${ISSUE_NUMBER}

Push branch:
git push origin issue-${ISSUE_NUMBER}-${SHORT_NAME}

Pull Request

Create PR using GitHub CLI:
gh pr create \
  --base codex/dev \
  --head issue-${ISSUE_NUMBER}-${SHORT_NAME} \
  --title "Spec 001 – ${DESC}" \
  --body "Closes #${ISSUE_NUMBER}

Implements task ${TASK_ID} from specs/001-tighten-deployment-contracts/tasks.md."

The task is not complete unless:
- the target file is updated
- tasks.md is updated
- the branch is pushed
- the PR is opened
PROMPT
