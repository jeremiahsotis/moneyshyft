# Migration Runner PR

## Summary
Describe the dedicated migration-runner work in this PR.

## Scope Confirmation
- [ ] No migration ownership redesign
- [ ] No runtime API redesign
- [ ] No production data changes from this PR
- [ ] No production runner cutover in this PR; `admin-api` remains the current authorized production runner

## Runner
- [ ] `apps/migration-runner` created
- [ ] runner reads only `shared/database/migrations`
- [ ] runner serves no HTTP traffic
- [ ] runner executes `knex migrate:latest` and exits
- [ ] image layout proves `/app/knexfile.js` resolves shared authority at `/app/shared/database/migrations`
- [ ] image excludes lane-local migration paths and runtime app/server files from the execution path

## Boundary
- [ ] runtime APIs remain blocked from production migration execution
- [ ] runner is documented as phase 2 after convergence
- [ ] this PR does not add `migration-runner` to the active production deploy sequence

## Verification
- [ ] Dockerfile builds
- [ ] knex config resolves shared authority
- [ ] container validation proves `ts-node/register` can load a shared TypeScript migration from the final image
- [ ] docs updated
