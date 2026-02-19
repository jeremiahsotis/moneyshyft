# Canonical Git Policy (RouteShyft)

This policy is mandatory and repository-wide.

Source material was imported from `~/Downloads/git_policy.md` and adapted for this repository.

## 1) Git + Branch Policy

- Branch-first is mandatory.
- Stage only relevant files.
- Never commit failing checks.
- Commit format is mandatory: `<story-id>: <imperative summary>`.
- Commit in small slices by AC/subtask scope.
- One PR per story branch.
- Story PRs must use merge commit.
- Do not squash-merge story PRs.
- Story PR base branch is mandatory: `codex/dev`.

## 2) Story-Scoped Workflow Policy (`AT` / `TA` / `DS` / `CR` and equivalents)

- Trigger set includes: `atdd`, `automate`, `create-story`, `dev-story`, `code-review`.
- Aliases and direct workflow-path invocations are treated as equivalent triggers.
- Required guard command before execution:
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --story <story-key-or-story-file>`
- Required story branch naming:
  - `codex/story-<story-id>-<short-slug>`
- Story branches must be created from `codex/dev` and merged back into `codex/dev`.
- Do not run story-scoped workflows on `master` or mismatched story branches.
- Keep all code, tests, and story artifacts for that story on the same story branch.

### Production Promotion Flow (Mandatory)

1. Story work merges into `codex/dev`.
2. Promote only from `codex/dev`:
   - `npm run promote:production -- "X-YYY: release <summary>"`
3. Push production branch:
   - `git push origin production`

## 3) Epic-Ops Workflow Policy

- Trigger set: `sprint-planning`, `retrospective`, `correct-course`.
- Required guard command before execution:
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --epic <epic-number>`
- Required epic branch naming:
  - `codex/epic-<epic-number>-ops`
- Keep epic-level artifacts on that matching epic-ops branch.

## 4) ATDD / TA / Code Review Gates

- ATDD (`atdd` / `AT`) is story-scoped and must run on the matching story branch.
- TA (`automate` / `TA`, test automation) is story-scoped and must run on the matching story branch.
- Code review (`code-review` / `CR`) is story-scoped and must run on the matching story branch.
- Run targeted story tests before each commit slice.
- Run full regression before PR is marked ready.
- PR description must include Story ID, AC traceability, and exact test commands/results.

### Playwright Regression Execution Policy (Mandatory)

- Playwright regression runs must target loopback IPv4 only:
  - `API_URL` host must be `127.0.0.1`
  - `BASE_URL` host must be `127.0.0.1`
- Backend and frontend must be live and reachable before Playwright starts.
- Enforcement is mandatory through:
  - `scripts/run-playwright-with-preflight.sh`
  - Root npm scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:debug`
- If preflight cannot reach backend/frontend health endpoints, Playwright execution must fail immediately.

### Corrected Kernel Gate (Mandatory for Feature Story Progression)

- Feature stories outside Epic 0 are blocked until corrected kernel acceptance criteria are complete.
- Required sprint-status conditions before starting or validating non-Epic-0 story workflows:
  - `0-10-kernel-readiness-verification-suite: done`
  - `course_correction.cc-2026-02-18.status: approved`
- Enforced by:
  - `scripts/start-story-branch.sh`
  - `scripts/branch-ensure-workflow.sh`

## 5) Story Creation Inside Epics (`create-story`)

- `create-story` uses sprint tracking as primary source (`sprint-status.yaml`) to choose/create the next story.
- It parses story key as `epic-story-title` (example: `4-018-model-router-...`) and sets `story_id` as `epic.story`.
- If it is first story in an epic, epic status is moved to `in-progress` when appropriate.
- It halts if epic is `done` (cannot create new story in a completed epic).
- It writes story output to implementation artifacts (`_bmad-output/implementation-artifacts/<story_key>.md`).
- It sets new story status to `ready-for-dev`.
- It updates sprint status entry for that story to `ready-for-dev`.

## 6) BMAD Safety / Artifact Boundaries

- Discover workflows via manifests; no hard-coded workflow lists.
- Execute via deterministic harness.
- Write artifacts only to allowed outputs:
  - `_bmad-output/planning-artifacts`
  - `_bmad-output/implementation-artifacts`
  - `docs/` (project context)
- Never modify external BMAD installations outside this repository.

## CI Enforcement

The CI policy gate runs `npm run policy:check` and fails the pipeline on violations.

- Script: `scripts/enforce-git-policy.sh`
- Workflow guard helper: `scripts/branch-ensure-workflow.sh`
