# Codex Implementation Brief — Slice 3
## PeopleCore + Identity Resolution Scaffolding (Repo-Specific)

## Read this first

This brief is written to be pasted directly into Codex.

It is intentionally explicit so Codex does not improvise architecture, file locations, or scope.

### Slice 3 objective

Build the first real PeopleCore + Identity Resolution scaffolding on top of the now-working Slice 1 and Slice 2 foundation.

This slice should create:

- PeopleCore shared contracts and event shapes
- ContactPoint + ContactPointLink domain scaffolding
- minimal Person / Household type scaffolding
- Identity decision foundations
- resolver review scaffolding
- API stub endpoints for PeopleCore
- backend integration tests for those endpoints
- frontend shell placeholder wiring for People view
- no full DB-backed implementation yet

### Hard rules
- Do not restructure the repo.
- Do not replace Nx.
- Do not refactor unrelated ConnectShyft API surfaces.
- Do not try to repair the broader ConnectShyft API type debt in this slice.
- Do not build full merge/link/rebind engines yet.
- Do not add database migrations yet unless absolutely required.
- Do not build real resolver UI yet.
- Do not build CaseShyft yet.
- Keep all new work isolated and testable.

### Key architectural decisions already locked
- Conversation is anchored to ContactPoint + orgUnit, not directly to Person.
- ContactPoint is first-class and not permanently owned by a Person.
- Identity can be provisional.
- Identity can be corrected later without destroying history.
- ConnectShyft is the communication substrate; CaseShyft will later be the main workspace.
- WorkIntent remains lightweight and transitional.
- PeopleCore is the source of truth for people, households, contact points, identity states, and duplicate/link/merge structures.

---

## Checkpoint structure

This work should be done in five checkpoints.

After each checkpoint:
1. run the required tests/commands
2. inspect results
3. create a commit before moving to the next checkpoint

---

# Checkpoint 1 — Add PeopleCore shared contracts

## Create these folders

```text
libs/contracts/src/people
libs/contracts/tests/people
```

## Create these files

```text
libs/contracts/src/people/person.ts
libs/contracts/src/people/contact-point.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/people/index.ts
libs/contracts/tests/people/contact-point.test.ts
libs/contracts/tests/people/resolver-review.test.ts
```

## File: `libs/contracts/src/people/person.ts`

```ts
export type PersonStatus =
  | 'active_confirmed'
  | 'active_provisional'
  | 'archived'
  | 'suppressed'
  | 'merged';

export type HouseholdStatus = 'active' | 'archived';

export type Person = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  status: PersonStatus;
  mergedIntoPersonId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Household = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  name?: string;
  status: HouseholdStatus;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdMembershipRole = 'head' | 'member' | 'unknown';

export type HouseholdMembership = {
  id: string;
  householdId: string;
  personId: string;
  role: HouseholdMembershipRole;
  isCurrent: boolean;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

## File: `libs/contracts/src/people/contact-point.ts`

```ts
export type ContactPointType = 'phone' | 'email' | 'other';

export type ContactPointStatus =
  | 'active_personal'
  | 'active_shared_possible'
  | 'active_shared_confirmed'
  | 'stale'
  | 'reassignment_suspected'
  | 'archived';

export type ContactPoint = {
  id: string;
  tenantId: string;
  type: ContactPointType;
  normalizedValue: string;
  rawValue?: string;
  status: ContactPointStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  lastInboundAt?: string;
  lastOutboundAt?: string;
  suspectedShared: boolean;
  confirmedShared: boolean;
  reassignmentSuspected: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContactPointLinkSubjectType = 'person' | 'household';
export type IdentityConfidenceBand = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type ContactPointLinkType = 'primary' | 'secondary' | 'historical' | 'unknown';

export type ContactPointLink = {
  id: string;
  contactPointId: string;
  subjectType: ContactPointLinkSubjectType;
  subjectId: string;
  linkType: ContactPointLinkType;
  confidenceBand: IdentityConfidenceBand;
  isCurrent: boolean;
  isPrimary: boolean;
  manuallyConfirmed: boolean;
  confirmationSource?: 'system' | 'user' | 'resolver';
  firstLinkedAt: string;
  lastConfirmedAt?: string;
  lastUsedAt?: string;
  linkedBy: 'system' | 'user' | 'resolver';
  linkedByUserId?: string;
  unlinkReason?: string;
  unlinkedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContactPointEventType =
  | 'inbound_seen'
  | 'outbound_seen'
  | 'state_changed'
  | 'reassignment_suspected'
  | 'shared_detected'
  | 'stale_detected';

export type ContactPointEvent = {
  id: string;
  contactPointId: string;
  eventType: ContactPointEventType;
  eventSource: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  createdAt: string;
};
```

## File: `libs/contracts/src/people/resolver-review.ts`

```ts
import type { IdentityConfidenceBand } from './contact-point';

export type ResolverReviewType =
  | 'very_high_duplicate_override'
  | 'shared_contact_ambiguity'
  | 'contact_point_reassignment'
  | 'merge_review'
  | 'subject_reassignment_review'
  | 'identity_conflict';

export type ResolverReviewStatus =
  | 'pending'
  | 'queued'
  | 'in_review'
  | 'waiting_for_more_info'
  | 'resolved_confirmed_existing'
  | 'resolved_confirmed_new'
  | 'resolved_shared_contact'
  | 'resolved_reassigned'
  | 'resolved_merged'
  | 'dismissed';

export type ResolverResolutionType =
  | 'confirm_existing_person'
  | 'confirm_new_person'
  | 'mark_shared_contact'
  | 'reassign_contact_point'
  | 'merge_people'
  | 'link_without_merge'
  | 'dismiss_no_action';

export type ResolverRiskFlag =
  | 'shared_contact_possible'
  | 'shared_contact_confirmed'
  | 'stale_contact'
  | 'archived_prior_owner'
  | 'conflicting_name_dob'
  | 'rapid_contact_reuse'
  | 'duplicate_creation_attempt'
  | 'high_confidence_override_attempt';

export type ResolverReview = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  reviewType: ResolverReviewType;
  reviewStatus: ResolverReviewStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  triggerSourceType: string;
  triggerSourceId: string;
  conversationId?: string;
  provisionalPersonId?: string;
  candidatePersonIds: string[];
  contactPointId?: string;
  confidenceBand: IdentityConfidenceBand;
  confidenceReasons: string[];
  riskFlags: ResolverRiskFlag[];
  requestedByUserId: string;
  assignedResolverUserId?: string;
  requestedAt: string;
  startedAt?: string;
  resolvedAt?: string;
  resolutionType?: ResolverResolutionType;
  resolutionReason?: string;
  resolutionNotes?: string;
};
```

## File: `libs/contracts/src/people/index.ts`

```ts
export * from './person';
export * from './contact-point';
export * from './resolver-review';
```

## Update file: `libs/contracts/src/index.ts`

Add:

```ts
export * from './people';
```

## File: `libs/contracts/tests/people/contact-point.test.ts`

```ts
import type { ContactPoint, ContactPointLink } from '../../src/people';

describe('people contact point contracts', () => {
  it('allows a first-class contact point shape', () => {
    const cp: ContactPoint = {
      id: 'cp_1',
      tenantId: 'tenant_1',
      type: 'phone',
      normalizedValue: '+12605551212',
      status: 'active_personal',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      suspectedShared: false,
      confirmedShared: false,
      reassignmentSuspected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(cp.type).toBe('phone');
  });

  it('allows links without assuming permanent ownership', () => {
    const link: ContactPointLink = {
      id: 'cpl_1',
      contactPointId: 'cp_1',
      subjectType: 'person',
      subjectId: 'person_1',
      linkType: 'primary',
      confidenceBand: 'high',
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: true,
      confirmationSource: 'user',
      firstLinkedAt: new Date().toISOString(),
      linkedBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(link.subjectType).toBe('person');
  });
});
```

## File: `libs/contracts/tests/people/resolver-review.test.ts`

```ts
import type { ResolverReview } from '../../src/people';

describe('resolver review contracts', () => {
  it('supports a first-class resolver review object', () => {
    const review: ResolverReview = {
      id: 'rr_1',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      reviewType: 'identity_conflict',
      reviewStatus: 'pending',
      priority: 'normal',
      triggerSourceType: 'conversation',
      triggerSourceId: 'conv_1',
      candidatePersonIds: ['person_1', 'person_2'],
      confidenceBand: 'very_high',
      confidenceReasons: ['Exact phone + DOB'],
      riskFlags: ['high_confidence_override_attempt'],
      requestedByUserId: 'user_1',
      requestedAt: new Date().toISOString(),
    };

    expect(review.reviewType).toBe('identity_conflict');
  });
});
```

## Run after Checkpoint 1

Run:

```bash
pnpm nx run contracts:test
```

## Commit after Checkpoint 1

Suggested commit message:

```text
feat(slice-3): add peoplecore shared contracts
```

---

# Checkpoint 2 — Add PeopleCore domain scaffolding in a safe place

## Use this location

Do not invent a new top-level structure. Use:

```text
domains/people
domains/people/contact-points
domains/people/identity
domains/people/resolver
```

## Create these folders

```text
domains/people/contact-points
domains/people/identity
domains/people/resolver
```

## Create these files

```text
domains/people/contact-points/contactPointMemoryStore.ts
domains/people/contact-points/contactPointState.ts
domains/people/identity/identityDecisionEngine.ts
domains/people/identity/confidenceBands.ts
domains/people/resolver/resolverReviewMemoryStore.ts
domains/people/index.ts
```

## File: `domains/people/contact-points/contactPointMemoryStore.ts`

Create a tiny in-memory store with exported functions for:
- `listContactPoints()`
- `createContactPoint(input)`
- `listContactPointLinks()`
- `createContactPointLink(input)`

This is scaffolding only.
Use arrays in module scope.
No database yet.

## File: `domains/people/contact-points/contactPointState.ts`

Add helper functions only:

- `isSharedContact(status)`
- `isStaleContact(status)`
- `requiresResolverReview(status)`

Based on the locked statuses.

## File: `domains/people/identity/confidenceBands.ts`

Export:
- `IDENTITY_CONFIDENCE_BANDS`
- helper `scoreToConfidenceBand(score: number)`

Use the already locked bands:
- very_low
- low
- medium
- high
- very_high

For now, use the locked thresholds:
- `<= 0` → very_low
- `1–39` → low
- `40–79` → medium
- `80–119` → high
- `>= 120` → very_high

## File: `domains/people/identity/identityDecisionEngine.ts`

Create a thin deterministic function:

```ts
type IdentityCandidateInput = {
  personId: string;
  score: number;
  reasons: string[];
};

type IdentityDecisionOutput = {
  confidenceBand: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  decisionType:
    | 'create_new_default'
    | 'suggest_attach'
    | 'require_confirmation'
    | 'require_override';
  candidates: IdentityCandidateInput[];
};
```

Export a function that:
- sorts candidates by score descending
- maps top score to confidence band
- maps confidence band to decision type using the locked logic:
  - very_low → create_new_default
  - low → suggest_attach
  - medium → require_confirmation
  - high → suggest_attach
  - very_high → require_override

No fuzzy matching yet.
No DB access yet.

## File: `domains/people/resolver/resolverReviewMemoryStore.ts`

Create a tiny in-memory store with:
- `listResolverReviews()`
- `createResolverReview(input)`

No queue engine yet.

## File: `domains/people/index.ts`

Re-export the above modules.

## Run after Checkpoint 2

Run:
- contracts tests
- any TS/build check that safely covers these files

If there is no clean target for domain-only TS checking yet, document the gap and verify through API imports in Checkpoint 3.

## Commit after Checkpoint 2

Suggested commit message:

```text
feat(slice-3): add peoplecore domain scaffolding
```

---

# Checkpoint 3 — Add minimal PeopleCore API surface in connectshyft-api

## Important rule

Do not wire broad old ConnectShyft lane modules into this slice.
Keep these endpoints isolated and minimal like the WorkIntent stub.

## Update file: `apps/connectshyft-api/src/app.ts`

Add these endpoints below the existing Slice 1 stubs and before complex middleware/route registration that would drag in old debt.

### GET `/people/contact-points`
Return the in-memory contact point list.

### POST `/people/contact-points`
Accept a minimal body:
- `type`
- `normalizedValue`
- optional `rawValue`

Create a ContactPoint in memory with:
- default `status = active_personal`
- timestamps
- all boolean flags false

### POST `/people/contact-point-links`
Accept:
- `contactPointId`
- `subjectType`
- `subjectId`
- `linkType`
- `confidenceBand`

Create an in-memory link.

### POST `/people/identity/decision`
Accept:
- `candidates: [{ personId, score, reasons }]`

Return the output of the identity decision engine.

### GET `/people/resolver-reviews`
Return current in-memory reviews.

### POST `/people/resolver-reviews`
Accept a minimal resolver review body and create a review in memory.

## Use imports from:
- `@shyft/contracts`
- `domains/people/...`

Do not add DB writes.
Do not hook into auth yet unless trivially required.
Do not attempt real person search yet.

---

## Create these integration tests

Create folder:

```text
tests/integration/peoplecore
```

Create files:

```text
tests/integration/peoplecore/contact-points.test.ts
tests/integration/peoplecore/identity-decision.test.ts
tests/integration/peoplecore/resolver-reviews.test.ts
```

## File: `tests/integration/peoplecore/contact-points.test.ts`

Test:
- create contact point
- list contact points
- create contact point link

## File: `tests/integration/peoplecore/identity-decision.test.ts`

Test:
- POST decision with a very high score candidate returns:
  - `confidenceBand = very_high`
  - `decisionType = require_override`

Test:
- POST decision with a medium score candidate returns:
  - `confidenceBand = medium`
  - `decisionType = require_confirmation`

## File: `tests/integration/peoplecore/resolver-reviews.test.ts`

Test:
- create resolver review
- list resolver reviews

## Connect the tests to the existing `connectshyft-api:test` target

Update the narrow integration command only as needed so these new PeopleCore tests are included without dragging in the broader broken lane surface.

Do not broaden the target to run the old broken app surface.

## Run after Checkpoint 3

Run:

```bash
pnpm nx run connectshyft-api:test
```

All Slice 1 and Slice 3 integration tests must pass.

## Commit after Checkpoint 3

Suggested commit message:

```text
feat(slice-3): add peoplecore api scaffolding and integration tests
```

---

# Checkpoint 4 — Add People shell integration in connectshyft-web

## Goal

The shell should now have a minimal real People view, not just a “coming soon” placeholder.

## Update file: `apps/connectshyft-web/src/views/Shell/PeopleView.vue`

Replace the placeholder with a minimal page that:
- displays the current SubjectContext orgUnitId
- has a button to call `GET /people/contact-points`
- renders a basic list of contact points returned
- has a second button or simple form to call `POST /people/identity/decision` with hardcoded sample candidate data
- renders the returned confidence band + decision type

Keep it ugly and simple.
No design work.
No Pinia store required unless already convenient.
Use direct fetch for this slice.

## Add frontend unit tests

Create:

```text
apps/connectshyft-web/src/views/Shell/__tests__/PeopleView.test.ts
```

Test at minimum:
- the view renders
- one button click path works with mocked fetch
- decision result text renders

Use the existing Vitest setup.

## Update smoke test

Update the shell smoke so `/app/people` verifies at least one real PeopleCore-related text appears, not just a placeholder.

## Run after Checkpoint 4

Run:

```bash
pnpm nx run connectshyft-web:test
pnpm nx run connectshyft-web:smoke
pnpm nx run connectshyft-web:build
```

## Commit after Checkpoint 4

Suggested commit message:

```text
feat(slice-3): add minimal people shell integration
```

---

# Checkpoint 5 — Add first event shapes and lightweight feature-flag shell hook

## Goal

Finish the slice by preparing for later identity events and the feature-flag rollout path without overbuilding.

## Create these files

```text
libs/contracts/src/people/events.ts
apps/connectshyft-web/src/shell/featureFlags.ts
apps/connectshyft-web/src/shell/__tests__/featureFlags.test.ts
```

## File: `libs/contracts/src/people/events.ts`

Add first PeopleCore event payload shapes only, not a full event system:

- `person.provisional_created`
- `person.confirmed`
- `contact_point.reassignment_suspected`
- `resolver_review.created`

Use `EventEnvelope<T>` from the existing contracts lib.

## Update `libs/contracts/src/people/index.ts`

Re-export `events.ts`.

## File: `apps/connectshyft-web/src/shell/featureFlags.ts`

Add a minimal helper only:

```ts
export type FeatureFlagMap = Record<string, boolean>;

export const defaultFeatureFlags: FeatureFlagMap = {
  'people.enabled': true,
  'people.identityDecision.enabled': true,
};

export function isFeatureEnabled(flags: FeatureFlagMap, key: string) {
  return Boolean(flags[key]);
}
```

Do not add full orgUnit/tenant resolution yet.

## File: `apps/connectshyft-web/src/shell/__tests__/featureFlags.test.ts`

Add one simple passing Vitest test.

## Run after Checkpoint 5

Run:

```bash
pnpm nx run contracts:test
pnpm nx run connectshyft-web:test
pnpm nx run connectshyft-api:test
pnpm nx run connectshyft-web:smoke
pnpm nx run connectshyft-web:build
```

## Commit after Checkpoint 5

Suggested commit message:

```text
feat(slice-3): add people events and shell feature flag foundation
```

---

# Definition of done

Slice 3 is complete only when all of these are true:

- PeopleCore shared contracts exist in `libs/contracts`
- domain scaffolding exists under `domains/people`
- identity decision scaffolding exists and is deterministic
- ContactPoint + ContactPointLink in-memory scaffolding exists
- resolver review in-memory scaffolding exists
- `connectshyft-api:test` passes with the new PeopleCore integration tests
- `connectshyft-web:test` passes with a real PeopleView unit test
- `/app/people` is no longer just a placeholder; it exercises real PeopleCore scaffolding
- smoke passes
- build passes
- no broad broken ConnectShyft lane surface was pulled back into the slice

---

# Explicit non-goals for this slice

Do not implement any of these here:

- real DB-backed PeopleCore
- migrations
- full Person CRUD
- merge engine
- link engine
- household UI
- full resolver UI
- ContactPoint event persistence
- full feature-flag rollout system
- CaseShyft
- identity rebinding engine across all downstream objects
- communications timeline integration with identity events

---

# If Codex gets stuck

If any of the following are unclear, Codex should stop and report the minimum blocker instead of improvising:
- exact import path behavior for `domains/people` in the current TS config
- existing API app export shape
- how to include the new PeopleCore integration tests in the narrow `connectshyft-api:test` command without reintroducing old broken lane surface
- frontend test mocking conventions in this repo

Do not guess. Report the blocker and wait.

---

# One-line paste version

Implement Slice 3 only: add PeopleCore shared contracts under `libs/contracts/src/people`, add deterministic PeopleCore scaffolding under `domains/people` for ContactPoint, ContactPointLink, confidence-band mapping, identity decision output, and resolver reviews using in-memory stores only, expose minimal isolated PeopleCore endpoints from `apps/connectshyft-api/src/app.ts`, add integration tests under `tests/integration/peoplecore`, replace the People shell placeholder in `apps/connectshyft-web/src/views/Shell/PeopleView.vue` with a minimal real PeopleCore demo using direct fetch, add a real Vitest unit test for that view, add first PeopleCore event shapes and a lightweight shell feature-flag helper, and keep scope isolated so this slice does not pull in the broader broken ConnectShyft API surface.
