# Research - Dedicated Migration Runner

## Decision: Use a JS-only one-shot app with only `package.json`, `knexfile.js`, and `Dockerfile`

Rationale:
- The architecture note explicitly recommends this minimal structure.
- The feature is phase-2 execution mechanics only, so adding `src/`, `dist/`, or reusable runtime code would be unnecessary surface area.
- A one-shot container avoids any routing, auth, or runtime-lane coupling.

Alternatives considered:
- Adding a TypeScript app with `src/` and a build step: rejected because it increases packaging complexity without improving migration ownership or safety.
- Reusing `admin-api` scripts: rejected because this feature is specifically about separating execution mechanics from runtime API deployment.

## Decision: Resolve shared migrations from `/app/shared/database/migrations` via `path.join(__dirname, 'shared', 'database', 'migrations')`

Rationale:
- This makes the image-relative path explicit and verifiable.
- It avoids depending on the current working directory.
- It keeps the runner independent from lane-local migration folders and from `admin-api` build outputs.

Alternatives considered:
- Relative `../shared/database/migrations` traversal: rejected because it is more brittle and depends on where the Dockerfile places app files.
- Reading from an env-configured migration directory: rejected because the approved direction requires a fixed shared-authority-only path.

## Decision: Execute shared TypeScript migrations through `ts-node/register` at runtime

Rationale:
- Shared authority is already authoritative in `shared/database/migrations` and currently consists of TypeScript migrations.
- The runner is explicitly approved as JS-only with no `dist/`; runtime TypeScript execution keeps the app minimal.
- This avoids duplicating the `admin-api` packaging/transpile step inside the runner.

Alternatives considered:
- Transpile shared migrations into JS during image build: rejected because it adds a build pipeline and a second packaged migration representation.
- Require shared migrations to be converted to JS in-repo: rejected because that would alter the established shared migration authority structure.

## Decision: Make `ts-node` and `typescript` runtime dependencies so `npm ci --omit=dev` is compatible

Rationale:
- The runtime command depends on both packages to load `.ts` migrations.
- Keeping them in `dependencies` allows a smaller install than full dev dependencies while keeping the execution path intact.
- This makes the dependency strategy explicit and removes ambiguity about runtime availability.

Alternatives considered:
- Put `ts-node` and `typescript` in `devDependencies`: rejected because production image installs using `npm ci --omit=dev` would fail at runtime.
- Install all dependencies including dev: rejected because it adds unnecessary image weight and weakens the explicit runtime dependency boundary.

## Decision: Keep `admin-api` as the current authorized production runner in this phase

Rationale:
- The constitution still states `admin-api` owns production migrations in the current platform phase.
- The user explicitly constrained this work to phase-2 execution mechanics without operational cutover.
- This allows the runner image to be built and validated without changing current production ownership.

Alternatives considered:
- Switch production execution to `migration-runner` now: rejected because it would be a cutover, not just phase-2 preparation.
- Remove `admin-api` migration execution commands: rejected because that would change the current authorized production path before the new runner is operationally adopted.

## Decision: Validate the runner by image inspection and direct CLI invocation, not by running production migrations

Rationale:
- The plan must not run production migrations, modify `public.knex_migrations`, or apply production SQL.
- Image layout verification is enough to prove the migration directory and execution command are wired correctly.
- Non-production/local DB runs can later validate CLI behavior without changing production ownership.

Alternatives considered:
- Production-like end-to-end migration execution during planning: rejected by constraint.
- HTTP health checks: rejected because the runner must not serve HTTP traffic.
