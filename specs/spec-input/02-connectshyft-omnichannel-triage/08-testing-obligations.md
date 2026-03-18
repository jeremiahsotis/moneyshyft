# Testing Obligations

## Required fixture/helpers additions
- communicationFactory
- conversationFactory
- submissionFactory
- triageItemFactory
- assignmentFactory
- channel-specific helper fixtures for phone, SMS/MMS, email, webchat, and website forms

## Required test coverage
- frontend/shared TS unit tests for triage helpers, guards, and reducers/view-models
- backend integration tests for channel normalization and triage persistence
- integration tests for assign / escalate / attach / create workflows
- contract tests for communication_received, triage_item_created, triage_item_assigned, and related events
- selective smoke coverage for core triage path

## Feature-flag / rollout coverage
- flag-off and flag-on tests for webchat and website forms if staged
- staged enablement coverage for new channels

## CI impact
- affected-quality
- affected-integration
- contract-tests
- frontend-smoke
- release-validation
- nightly-burn-in

## Notes
ConnectShyft is live and operationally sensitive. Regression protection must be strong.
