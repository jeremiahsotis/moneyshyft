# Issue Execution Playbook

## Repository

All issue execution in this round happens in the `connectshyft` repository.

## Feature

Feature: `001-tighten-deployment-contracts`

## Task Tracker

File: `specs/001-tighten-deployment-contracts/tasks.md`

For every issue:

- update the matching task checkbox from `[ ]` to `[x]`
- do not modify any other task lines

## Branch Naming

Use:

`issue-<issue-number>-<short-task-name>`

## Commit Format

Use:

`<type>(spec-001): <short description>`

Blank line

`Refs #<issue-number>`

## Push Requirement

Push the branch to origin after committing.

## Pull Request

Open a PR with GitHub CLI using base branch `codex/dev`.

Format:

`gh pr create --base codex/dev --head <branch> --title "<title>" --body "<body>"`

PR body must include:

`Closes #<issue-number>`

## Surgical Edit Rule

When editing an existing document:

- modify only the required section
- do not rewrite the whole file
- keep the diff minimal

## Completion Rule

The task is not complete unless the diff includes:

- the required file change
- the matching `tasks.md` checkbox update
- a pushed branch
- an opened PR
