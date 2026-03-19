# Codex Implementation Brief — Slice 1
## Testing + CI Foundation + Thin Application Shell (Repo-Specific)

## Read this first

This brief is written to be pasted directly into Codex.

It is intentionally explicit so Codex does not improvise architecture, file locations, or scope.

### Hard rules
- Do not restructure the repo.
- Do not replace Nx.
- Do not move existing apps or libs.
- Do not rewrite existing routing patterns beyond what is required here.
- Do not change the existing `/health` response shape.
- Do not add PeopleCore, Identity Resolution, or full WorkIntent logic yet.
- Do not implement the full feature-flag system yet.
- Do not expand this into full Testing + CI Architecture in one pass.
- Keep this slice minimal and repo-safe.

### Objective
Implement the first vertical slice that gives us:
- shared contracts foundation
- shell subject context foundation
- shell placeholder routes
- minimal WorkIntent stub endpoint
- contract test
- backend integration tests
- minimal frontend smoke coverage
- minimal CI-safe path

---

## Checkpoint structure

This work should be done in four checkpoints.

After each checkpoint:
1. run the required tests/commands
2. inspect results
3. create a commit before moving to the next checkpoint

---

# Checkpoint 1 — Shared contracts foundation

## Create these folders

```text
libs/contracts/src
libs/contracts/tests
```

## Create these files

```text
libs/contracts/src/subject-context.ts
libs/contracts/src/event-envelope.ts
libs/contracts/src/index.ts
libs/contracts/tests/event-envelope.test.ts
libs/contracts/jest.config.js
libs/contracts/project.json
libs/contracts/tsconfig.json
```

## File: `libs/contracts/src/subject-context.ts`

```ts
export type SubjectContext = {
  orgUnitId: string
  personId?: string
  provisionalPersonId?: string
  conversationId?: string
  contactPointId?: string
}
```

## File: `libs/contracts/src/event-envelope.ts`

```ts
import type { SubjectContext } from './subject-context';

export type EventEnvelope<T = unknown> = {
  id: string
  type: string
  source: string
  tenantId: string
  orgUnitId: string
  subject: SubjectContext
  payload: T
  createdAt: string
}

export function validateEventEnvelope(event: EventEnvelope) {
  if (!event.id) throw new Error('Missing id');
  if (!event.type) throw new Error('Missing type');
  if (!event.orgUnitId) throw new Error('Missing orgUnitId');
  if (!event.subject?.orgUnitId) throw new Error('Missing subject.orgUnitId');
}
```

## File: `libs/contracts/src/index.ts`

```ts
export * from './subject-context';
export * from './event-envelope';
```

## File: `libs/contracts/tests/event-envelope.test.ts`

```ts
import { validateEventEnvelope } from '../src/event-envelope';

describe('EventEnvelope contract', () => {
  it('passes with valid shape', () => {
    expect(() =>
      validateEventEnvelope({
        id: '1',
        type: 'test.event',
        source: 'unit',
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        subject: { orgUnitId: 'org-1' },
        payload: {},
        createdAt: new Date().toISOString(),
      })
    ).not.toThrow();
  });

  it('fails with missing id', () => {
    expect(() =>
      validateEventEnvelope({
        type: 'test.event',
        source: 'unit',
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        subject: { orgUnitId: 'org-1' },
        payload: {},
        createdAt: new Date().toISOString(),
      } as any)
    ).toThrow('Missing id');
  });
});
```

## File: `libs/contracts/jest.config.js`

```js
module.exports = {
  displayName: 'contracts',
  testEnvironment: 'node',
};
```

## File: `libs/contracts/project.json`

```json
{
  "name": "contracts",
  "sourceRoot": "libs/contracts/src",
  "targets": {
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "libs/contracts/jest.config.js"
      }
    }
  }
}
```

## File: `libs/contracts/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node", "jest"]
  },
  "include": ["src", "tests"]
}
```

## Update file: `tsconfig.base.json`

Add this path alias under `compilerOptions.paths` without removing existing paths:

```json
"@shyft/contracts": ["libs/contracts/src/index.ts"]
```

## Run after Checkpoint 1

Run the smallest safe validation commands that work in this repo. Prefer:

```bash
pnpm nx run contracts:test
```

If that fails because the project is not picked up automatically, stop and fix only what is required for the target to run.

## Commit after Checkpoint 1

Suggested commit message:

```text
feat(slice-1): add shared contracts foundation
```

---

# Checkpoint 2 — Shell subject context + placeholder routes in connectshyft-web

## Create this folder

```text
apps/connectshyft-web/src/shell
```

## Create this file

```text
apps/connectshyft-web/src/shell/subjectContext.ts
```

## File: `apps/connectshyft-web/src/shell/subjectContext.ts`

```ts
import type { SubjectContext } from '@shyft/contracts';
import { InjectionKey, Ref, inject, ref } from 'vue';

export const SUBJECT_CONTEXT_KEY: InjectionKey<Ref<SubjectContext>> = Symbol('subject-context');

export function createSubjectContext() {
  return ref<SubjectContext>({
    orgUnitId: 'demo-org',
  });
}

export function useSubjectContext() {
  const ctx = inject(SUBJECT_CONTEXT_KEY);
  if (!ctx) {
    throw new Error('SubjectContext not provided');
  }
  return ctx;
}
```

## Update file: `apps/connectshyft-web/src/main.ts`

Add this import:

```ts
import { SUBJECT_CONTEXT_KEY, createSubjectContext } from './shell/subjectContext';
```

Replace the bootstrap section with this pattern:

```ts
const app = createApp(App);

app.provide(SUBJECT_CONTEXT_KEY, createSubjectContext());

app.use(pinia)
  .use(router)
  .mount('#app');
```

Do not remove existing router/pinia/css imports.

## Create this folder

```text
apps/connectshyft-web/src/views/Shell
```

## Create these files

```text
apps/connectshyft-web/src/views/Shell/ConnectView.vue
apps/connectshyft-web/src/views/Shell/PeopleView.vue
apps/connectshyft-web/src/views/Shell/WorkView.vue
```

## File: `apps/connectshyft-web/src/views/Shell/ConnectView.vue`

```vue
<template>
  <div>Connect shell view coming soon</div>
</template>
```

## File: `apps/connectshyft-web/src/views/Shell/PeopleView.vue`

```vue
<template>
  <div>People shell view coming soon</div>
</template>
```

## File: `apps/connectshyft-web/src/views/Shell/WorkView.vue`

```vue
<template>
  <div>Work shell view coming soon</div>
</template>
```

## Update file: `apps/connectshyft-web/src/router/index.ts`

Add imports:

```ts
import ConnectView from '../views/Shell/ConnectView.vue';
import PeopleView from '../views/Shell/PeopleView.vue';
import WorkView from '../views/Shell/WorkView.vue';
```

Add these routes to the existing routes array without removing current routes:

```ts
{
  path: '/app/connect',
  name: 'shell-connect',
  component: ConnectView,
},
{
  path: '/app/people',
  name: 'shell-people',
  component: PeopleView,
},
{
  path: '/app/work',
  name: 'shell-work',
  component: WorkView,
},
```

## Run after Checkpoint 2

Run the frontend app in the normal repo way and verify manually that:
- `/app/connect` loads
- `/app/people` loads
- `/app/work` loads

Also run any existing lint/typecheck target that applies to `connectshyft-web`.

If there is a known Nx target, use it. Do not invent new build tooling.

## Commit after Checkpoint 2

Suggested commit message:

```text
feat(slice-1): add shell subject context and placeholder routes
```

---

# Checkpoint 3 — Minimal API stub + backend integration tests

## Important note

Do not add a new `/health` route. It already exists in:

```text
apps/connectshyft-api/src/app.ts
```

Use the existing response shape:
- `status: 'ok'`
- `timestamp: ...`

## Update file: `apps/connectshyft-api/src/app.ts`

Add this route below the existing `/health` route and before middleware/route registration that could complicate it:

```ts
app.post('/work-intents', (_req: Request, res: Response) => {
  res.json({
    id: 'wi_1',
    status: 'open',
    intentType: 'needs_follow_up',
  });
});
```

Do not add DB logic.
Do not add validation middleware yet.
Do not add auth complexity yet.

## Create this folder

```text
tests/integration/connectshyft-api
```

## Create these files

```text
tests/integration/connectshyft-api/health.test.ts
tests/integration/connectshyft-api/work-intents.test.ts
```

## File: `tests/integration/connectshyft-api/health.test.ts`

```ts
import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft-api health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
```

## File: `tests/integration/connectshyft-api/work-intents.test.ts`

```ts
import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft-api work intents', () => {
  it('creates a work intent stub', async () => {
    const res = await request(app).post('/work-intents').send({
      intentType: 'needs_follow_up',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('open');
    expect(res.body.intentType).toBe('needs_follow_up');
  });
});
```

## Dependency note

If `supertest` or related types are missing, add only what is required. Do not change test runners broadly in this slice.

## Run after Checkpoint 3

Run the backend integration tests in the safest existing way for this repo.

At minimum verify:
- `/health` test passes
- `/work-intents` test passes

If there is not yet a clean Nx target for these tests, document the gap and use the smallest working command without inventing a large custom system in this slice.

## Commit after Checkpoint 3

Suggested commit message:

```text
feat(slice-1): add work intent stub and backend integration tests
```

---

# Checkpoint 4 — Minimal frontend smoke + minimal CI update

## Frontend smoke

Use the existing Playwright setup already in the repo.

Create or update a smoke test so it verifies at least one shell route, preferably all three:

- `/app/connect`
- `/app/people`
- `/app/work`

The smoke should only verify:
- page loads
- expected placeholder text is visible

Do not create a large e2e suite.

## Minimal CI update

Update existing GitHub Actions workflow(s) so this slice is covered, but do not fully split CI yet.

Ensure CI runs at least:
- lint or existing equivalent
- typecheck if already present
- contracts test
- backend test
- build or existing app sanity step

If the repo already uses Nx in CI, prefer commands like:

```bash
pnpm nx affected --target=test
pnpm nx affected --target=build
```

And explicitly include the contracts test if needed:

```bash
pnpm nx run contracts:test
```

Do not implement the full PR/production workflow split in this slice.

## Run after Checkpoint 4

Verify:
- Playwright smoke passes
- CI config is syntactically valid
- no existing workflow is obviously broken

## Commit after Checkpoint 4

Suggested commit message:

```text
feat(slice-1): add shell smoke coverage and minimal CI updates
```

---

# Definition of done

Slice 1 is complete only when all of these are true:

- `libs/contracts` exists
- `SubjectContext` and `EventEnvelope` exist and are tested
- `connectshyft-web` provides `SubjectContext` at app root
- shell placeholder routes exist:
  - `/app/connect`
  - `/app/people`
  - `/app/work`
- existing `/health` route still works unchanged
- `POST /work-intents` stub exists
- backend integration tests exist and pass
- at least one frontend smoke test exists and passes
- CI includes this slice without breaking the repo

---

# Explicit non-goals for this slice

Do not implement any of these here:

- full feature-flag system
- full WorkIntent model
- PeopleCore
- Identity Resolution engine
- ConnectShyft communications model changes
- full Testing + CI Architecture rollout
- repo restructuring
- design polish
- auth redesign
- CaseShyft

---

# If Codex gets stuck

If any of the following are unclear, Codex should stop and report the minimum blocker instead of improvising:
- existing Nx target names
- existing frontend startup command
- exact Playwright test location conventions
- existing CI workflow structure

Do not guess. Report the blocker and wait.

---

# One-line paste version

Implement Slice 1 only: add `libs/contracts` with `SubjectContext` and `EventEnvelope` plus tests, wire `SubjectContext` into `apps/connectshyft-web/src/main.ts`, add placeholder shell views and routes at `/app/connect`, `/app/people`, `/app/work`, add a stub `POST /work-intents` endpoint in `apps/connectshyft-api/src/app.ts` without DB work, add Supertest integration tests under `tests/integration/connectshyft-api`, add one minimal Playwright shell smoke test, and update CI minimally without restructuring the repo or expanding scope beyond this slice.
