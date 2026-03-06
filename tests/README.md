# Test Framework Guide

## Setup

1. Install dependencies:
   `npm install`
2. Copy environment defaults:
   `cp .env.example .env`
3. Fill `.env` values for your local stack.

## Running Tests

- Headless:
  `npm run test:e2e`
- Headed:
  `npm run test:e2e:headed`
- Debug:
  `npm run test:e2e:debug`

## Priority Criteria

- `@P0`: release-blocking path, no acceptable workaround, high business risk.
- `@P1`: critical workflow, workaround exists but failure is not acceptable long-term.
- Keep `@P0` intentionally small and stable.

## Priority Baseline Map

| File | Scenario | Priority | Reason |
| --- | --- | --- | --- |
| `tests/auth/login.spec.ts` | valid login | `@P0` | entry gate for all authenticated workflows |
| `tests/dashboard/load.spec.ts` | dashboard loads key widgets | `@P0` | first post-login health signal |
| `tests/transactions/create.spec.ts` | create transaction | `@P0` | core write-path integrity |
| `tests/transactions/split.spec.ts` | split transaction | `@P1` | important budgeting operation |
| `tests/debts/payment.spec.ts` | debt payment flow | `@P1` | critical feature domain |
| `tests/goals/create-contribute.spec.ts` | goal contribution flow | `@P1` | critical feature domain |
| `tests/extra-money/assign.spec.ts` | single assignment flow | `@P1` | core allocation workflow |
| `tests/extra-money/multi-assign.spec.ts` | multi-category assignment | `@P1` | high-value allocation variant |
| `tests/extra-money/reserve-goals.spec.ts` | reserve to goal allocation | `@P1` | cross-feature accounting path |
| `tests/recurring/approve-post.spec.ts` | recurring approve/post | `@P1` | operational continuity |
| `tests/navigation/core.spec.ts` | primary navigation | `@P1` | critical access across major sections |

## Architecture Overview

- `tests/e2e/`: end-to-end specs.
- `tests/support/fixtures/`: typed fixture composition and lifecycle hooks.
- `tests/support/fixtures/factories/`: faker-backed test data factories.
- `tests/support/helpers/`: reusable API/network/auth helpers.
- `tests/helpers/`: legacy helpers still used by existing specs.

## Best Practices

- Prefer stable selectors (`data-testid`) for new tests.
- Keep tests isolated; no hidden dependencies between specs.
- Use factories for test data instead of inline literals.
- Capture cleanup in fixture teardown paths.
- Follow Given/When/Then structure for readability.

## CI Integration Notes

- Playwright outputs are configured to:
  - `tests/artifacts/test-results/`
  - `tests/artifacts/playwright-report/`
  - `tests/artifacts/junit/`
- Use tags like `@P0`, `@P1`, `@P2`, `@P3` for filtering.

## Knowledge Base References

- `_bmad/tea/testarch/knowledge/fixture-architecture.md`
- `_bmad/tea/testarch/knowledge/data-factories.md`
- `_bmad/tea/testarch/knowledge/network-first.md`
- `_bmad/tea/testarch/knowledge/playwright-config.md`
- `_bmad/tea/testarch/knowledge/test-quality.md`

## Troubleshooting

- If base URL is wrong, set `BASE_URL` in `.env`.
- If auth tests fail, verify `TEST_EMAIL` and `TEST_PASSWORD`.
- Open HTML report with:
  `npx playwright show-report tests/artifacts/playwright-report`
