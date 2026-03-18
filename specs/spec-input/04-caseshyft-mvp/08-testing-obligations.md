# Testing Obligations

## Required fixture/helpers additions
- caseFactory
- caseNoteFactory
- caseTaskFactory
- caseServiceItemFactory
- case communication linkage helpers

## Required test coverage
- unit tests for case state transitions and workspace helpers
- backend integration tests for create case, assign case, notes, tasks, and service items
- integration tests for create-from-triage flow
- integration tests for communication linkage and timeline composition
- contract tests for case_created and communication_linked_to_case events

## Smoke coverage
- selective smoke path for triage → case creation → note/task update

## CI impact
- affected-quality
- affected-integration
- contract-tests
- frontend-smoke
- release-validation
- nightly-burn-in

## Notes
CaseShyft is the first durable operational workspace. Test the create-from-triage path early.
