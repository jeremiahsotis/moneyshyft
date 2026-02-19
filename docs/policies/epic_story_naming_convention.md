# Epic and Story Naming Convention

## Purpose
Avoid ambiguity when multiple product streams live in the same monorepo.

## Streams
- `MONO` = monolithic monorepo core stream (Shyft baseline)
- `CS` = ConnectShyft stream

## Required References in Communication
- Epic references must include stream prefix:
  - `MONO-E1`, `MONO-E2`, ...
  - `CS-E1`, `CS-E2`, ...
- Story references must include stream prefix:
  - `MONO-S1.1`, `MONO-S1.2`, ...
  - `CS-S1.1`, `CS-S1.2`, ...

## Required References in Workflow Requests
- Do not use bare `Epic 1` or `Story 1.2`.
- Always include stream + ID in prompts and commands:
  - `cs MONO-E1 all stories`
  - `create story CS-S3.2`

## Artifact Naming Guidance
- New generated planning artifacts should include stream key in filename.
  - Example: `epics-MONO-YYYY-MM-DD.md`, `epics-CS-YYYY-MM-DD.md`
- New generated sprint status files should include stream key in filename.
  - Example: `sprint-status-mono.yaml`, `sprint-status-connectshyft.yaml`

## Backward Compatibility
- Existing files without stream key may remain.
- When reading legacy files, map them explicitly:
  - `epics.md` + `sprint-status.yaml` => `MONO`
  - `epics-ConnectShyft-*.md` + `sprint-status-connectshyft.yaml` => `CS`

## Enforcement Rule
- Any workflow run request missing stream prefix is considered ambiguous and must be clarified before execution.
