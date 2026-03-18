# Testing Obligations

## Required shared deliverables
- establish shared Vitest configuration for frontend and shared TypeScript
- preserve existing Jest API coverage without forced migration
- create backend integration harness skeleton using migration-runner
- create shared contract harness for event envelope and DTO validation
- create minimal feature-flag / rollout testing helpers
- define Nx target conventions for test:unit, test:integration, test:contracts, test:smoke, and test:e2e
- define CI workflow split for PR and production merge validation

## Required test coverage
- validate shared Vitest configs with at least one active web app
- validate backend integration harness can boot DB, run migrations, seed, and tear down
- validate event envelope schema with example current and future-hook events
- validate feature-flag helpers with flag-on / flag-off tests
- validate CI workflows run the correct target classes

## CI impact
- repo-guard
- affected-quality
- affected-integration
- contract-tests
- frontend-smoke
- release-validation
- nightly-burn-in

## Notes
This package creates the quality spine other packages extend. Later packages must add domain-specific helpers rather than invent new patterns.
