# Issue Execution Playbook

Implement Issue #<ISSUE_NUMBER> in the connectshyft repository using:
architecture/contracts/issue_execution_playbook.md

Task ID: <TASK_ID>
Task: <SHORT TASK DESCRIPTION>

Target file
<RELATIVE_FILE_PATH>

--------------------------------------------------
File Inspection Rule
--------------------------------------------------

Before making changes:

1. Open and read the existing target file.
2. Base all modifications on the current file contents.
3. Do not reconstruct the file from the prompt.
4. Preserve all existing configuration unless it conflicts with the task.

--------------------------------------------------
Editing Rule
--------------------------------------------------

Apply a surgical edit.

- Modify only the sections required for this task.
- Preserve document structure and ordering.
- Do not rewrite unrelated sections.

--------------------------------------------------
Structured Config Rule (YAML / JSON / config files)
--------------------------------------------------

If the target file is a structured configuration file:

- Output the COMPLETE file after modification.
- Do not output partial patches or snippets.
- Preserve indentation and structure.
- Do not introduce new top-level keys unless required by the task.
- Mentally validate the configuration before output.

--------------------------------------------------
Contract Rules (if applicable)
--------------------------------------------------

Normalize the file so it clearly enforces these rules:

- <RULE 1>
- <RULE 2>
- <RULE 3>
- <RULE 4>

--------------------------------------------------
Scope Rules
--------------------------------------------------

- Only modify sections related to this task.
- Do not redesign architecture or deployment topology.
- Preserve existing structure unless clarification is required.

--------------------------------------------------
Git Workflow
--------------------------------------------------

Create branch:

git checkout -b issue-<ISSUE_NUMBER>-<short-task-name>

Commit message format:

<type>(spec-001): <short description>

Refs #<ISSUE_NUMBER>

Push branch:

git push origin issue-<ISSUE_NUMBER>-<short-task-name>

--------------------------------------------------
Task Tracker Update
--------------------------------------------------

Update:

specs/001-tighten-deployment-contracts/tasks.md

Change the checkbox for <TASK_ID> from:

[ ]

to:

[x]

Do not modify any other task lines.

--------------------------------------------------
Pull Request
--------------------------------------------------

Create PR using GitHub CLI:

gh pr create \
  --base codex/dev \
  --head issue-<ISSUE_NUMBER>-<short-task-name> \
  --title "Spec 001 – <short description>" \
  --body "Closes #<ISSUE_NUMBER>

Implements task <TASK_ID> from specs/001-tighten-deployment-contracts/tasks.md."

--------------------------------------------------
Completion Requirement
--------------------------------------------------

The task is not complete unless:

- the target file is updated
- tasks.md checkbox is updated
- the branch is pushed
- the PR is opened