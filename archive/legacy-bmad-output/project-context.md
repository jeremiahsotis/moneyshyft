---
project_name: 'Shyft'
user_name: 'Jeremiah'
date: '2026-02-17'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 49
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Monorepo-style layout with two apps:
- Backend: `src/` -> Node `>=20`, Express `4.18.2`, TypeScript `5.3.3`, Knex `3.0.1`, pg `8.11.3`, Joi `17.11.0`, JWT (`jsonwebtoken 9.0.2`), Jest `29.7.0`.
- Frontend: `frontend/` -> Vue `3.5.13`, Vue Router `4.5.0`, Pinia `2.3.0`, Axios `1.7.9`, Vite `5.0.11`, TypeScript `5.6.0`, Tailwind `3.4.1`.
- Runtime integration: frontend dev server proxies `/api` to backend on `http://localhost:3000`.
- Production deployment pattern: backend+postgres in Docker Compose, host nginx serves frontend dist and proxies API.
- Planning constraint sources: `ROADMAP.md`, `docs/routeshyft/*`, `AGENTS.md`, `docs/policies/git_policy.md`.

## Monolith Conversion Plan Constraints (Canonical)

- Use small, deploy-safe PRs in this exact order:
1. Add target structure and aliases only.
2. Add canonical app entrypoint and centralized route registration.
3. Move Money module to `src/modules/money` mechanically with unchanged behavior.
4. Extract platform kernel helpers (db/tenancy/envelopes/audit).
5. Move migrations to `src/db/migrations` and seeds to `src/db/seeds`; prepare schema strategy.
6. Add route canary module with `GET /api/route/_health`.
7. Add minimal command bus and convert one write endpoint.
8. Add `platform.outbox_events` migration.
- Do not refactor business logic in the same PR as large file moves.
- Do not introduce complex CQRS or service splitting during initial conversion.

## CI & Git Policy Constraints (Required)

- `docs/policies/git_policy.md` is mandatory and must be treated as a blocking policy source.
- CI must run `policy` first via `npm run policy:check`; downstream jobs must be blocked on failures.
- Required CI target-state job graph:
1. `policy`
2. `lint`
3. `test` (Playwright 4 shards)
4. `burn-in` (10-iteration flake loop on PR/scheduled runs)
5. `quality-gates` (`@P0` pass rate 100%, `@P1` pass rate >=95%)
6. `backend-contracts` (optional `workflow_dispatch` lane with `run_backend_contracts=true`)
7. `report`
- Required policy guard commands:
- `npm run policy:check`
- `npm run branch:ensure-workflow -- --workflow <name-or-path> --story <story-key-or-story-file>`
- `npm run branch:ensure-workflow -- --workflow <name-or-path> --epic <epic-number>`
- CI artifact expectations (30-day default retention):
- `tests/artifacts/test-results/`
- `tests/artifacts/playwright-report/`
- `tests/artifacts/junit/`
- `tests/artifacts/gates/`
- Local CI parity commands:
- `scripts/ci-local.sh`
- `scripts/burn-in.sh 10`
- `scripts/test-changed.sh origin/main`
- `scripts/quality-gates.sh`
- `npm run test:contracts:backend`

## Critical Implementation Rules

### Language-Specific Rules

- Keep TypeScript strict-safe behavior; backend and frontend both run with `strict: true`.
- Backend module style is CommonJS (`module: commonjs`), frontend is ESM/bundler mode. Do not copy imports blindly across apps.
- Preserve 2-space indentation and existing naming style in touched files.
- Avoid introducing broad type loosening (`any`, blanket `as unknown as`) unless unavoidable and localized.
- Keep route handlers thin; business logic belongs in services.

### Framework-Specific Rules

- For conversion work, target directories are `src/platform`, `src/modules`, `src/api`, `src/db/*` while preserving existing behavior.
- Backend routes must live under `src/src/routes/api/v1/<resource>.ts`.
- Validators belong in `src/src/validators/<resource>.validators.ts` and should be wired via existing `validateRequest` middleware.
- Middleware order in backend app is important: CORS/json/cookies -> request logging -> routes -> 404 -> error handler.
- Frontend domain state changes should flow through Pinia stores, not ad hoc component-level API logic.
- Frontend imports should prefer `@/` alias where project already uses it.
- New backend imports should adopt conversion aliases when paths exist:
- `@platform/*` -> `src/platform/*`
- `@modules/*` -> `src/modules/*`
- `@api/*` -> `src/api/*`

### Testing Rules

- Backend changes should include/adjust Jest tests when logic changes (service-layer tests preferred for domain behavior).
- Maintain current test naming conventions (`*.test.ts`) and colocate with backend service patterns in `src/src/services/__tests__` when applicable.
- Frontend has no configured automated runner; include explicit manual verification steps for UI-impacting work.
- For migration-heavy changes, validate migration up/down behavior and data integrity assumptions.

### Code Quality & Style Rules

- Follow repository structure exactly; do not relocate modules without explicit migration reason.
- Keep migrations additive and ordered; use descriptive migration names and avoid rewriting past migrations.
- During migration centralization, preserve migration history semantics while changing only path/source-of-truth location.
- Do not commit secrets; backend env values stay in `src/.env` and frontend env via Vite env handling.
- Keep diffs minimal and consistent with local style; no speculative large-scale refactors during feature work.
- Preserve API versioning under `/api/v1` unless an explicit versioning migration is planned.

### Development Workflow Rules

- Standard backend workflow: `cd src && npm run dev|build|test|migrate:latest`.
- Standard frontend workflow: `cd frontend && npm run dev|build|preview`.
- Commit format should follow repo convention (`Fix:`, `Docs:`, `chore:`).
- For UI changes, add manual test notes and screenshots/GIFs in PR context.
- For production migration work, use the production migration command path defined by repo docs (`migrate:latest:prod` in container context).
- Always satisfy git policy and branch/workflow guard checks before story/epic workflow actions.

### Critical Don't-Miss Rules

- Brownfield rule: preserve existing behavior unless explicitly part of planned migration scope.
- Monolith transition rule: execute in strict order `Phase 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6`; do not start feature phases before kernel hardening.
- Conversion rule: execute structural Phase A-H sequence before deep module expansion.
- Platform-kernel rule (Phase 0): all new module work must align to tenancy resolution (`tenant_id`), first-party auth hardening, CSRF, outbox/events, and shared response envelope.
- Cross-module coupling rule: avoid direct module-to-module calls for mutations; prefer event/outbox-driven boundaries.
- API response rule for business refusals: use envelope strategy (`ok=false` + HTTP 200) where platform contract requires it.
- WP integration rule: WordPress is thin UI where specified; avoid dual-write patterns.
- Auth security rule: keep cookies `HttpOnly` and environment-aware `secure`/`sameSite`; migration to parent-domain cookie + CSRF must be explicit and tested.
- Tenancy safety rule: all new persistence/query paths in platformized modules must apply tenant filters; no unscoped read/write paths.
- Route canary rule: add and keep `/api/route/_health` to validate module registration before RouteShyft core endpoints.
- Outbox readiness rule: add `platform.outbox_events` early to avoid future cross-module write coupling.
- Policy gate rule: if `npm run policy:check` fails, implementation work is blocked until fixed.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules here and repository instructions in `AGENTS.md`.
- When rules conflict, prefer the more restrictive/safe interpretation and keep changes scoped.
- Update this file if durable project patterns or platform contracts change.

**For Humans:**

- Keep this file lean and specific to non-obvious implementation constraints.
- Update when stack versions, migration strategy, or platform contracts evolve.
- Revisit after each major phase to remove stale rules and add newly proven guardrails.

Last Updated: 2026-02-17
