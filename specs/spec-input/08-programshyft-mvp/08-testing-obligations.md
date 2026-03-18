# Testing Obligations

## Required fixture/helpers additions
- programFactory
- sessionFactory
- cohortFactory
- participantFactory
- attendanceFactory
- milestoneFactory

## Required test coverage
- unit tests for enrollment and milestone helpers
- backend integration tests for program/session/cohort/participant persistence
- integration tests for enrollment visibility with requirement status
- attendance and milestone progression tests
- contract tests for program_created, participant_enrolled, attendance_recorded, and milestone_completed events

## CI impact
- affected-quality
- affected-integration
- contract-tests
- frontend-smoke
- release-validation

## Notes
ProgramShyft should add structured operational coverage without duplicating CaseShyft or ConnectShyft ownership.
