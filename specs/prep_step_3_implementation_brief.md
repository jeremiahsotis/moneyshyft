# PREP STEP 3 — IMPLEMENTATION BRIEF
**Title:** Build the Shared Application Shell and Context Unification Layer at `app.shyftunity.com`

## 1. Objective

Deliver the unified ShyftUnity application shell at **`app.shyftunity.com`** so that:

- People and ConnectShyft live inside one coherent application frame
- the shell becomes the authoritative top-level experience for MVP
- app-level routing, navigation, orgUnit context, subject context, and module visibility are unified
- People and ConnectShyft stop feeling like adjacent tools and start feeling like one product
- shell-level polish improves coherence without forcing premature deep per-view redesign
- the system is ready for later THE_GOAL-level polish and future CaseShyft readiness work

**Done =** a user can log into `app.shyftunity.com`, move between People and ConnectShyft inside one stable shell, keep orgUnit and subject context when appropriate, and never see fragmented app chrome or engineering-artifact framing.

---

## 2. Locked Product Decisions

The following decisions are already locked and are authoritative for Prep Step 3:

### Shell scope
- MVP shell includes **People + ConnectShyft only**
- unfinished modules are hidden entirely
- no fake modules or placeholder destinations in MVP

### Domain / deployment target
- the unified application shell is served from **`app.shyftunity.com`**
- deployment work will require:
  - **Nginx** configuration for the application host
  - **Cloudflare DNS** configuration for `app.shyftunity.com`
- Prep Step 3 should account for this deployment target explicitly in architecture and routing assumptions

### Navigation
- top-level nav for MVP:
  - **People**
  - **ConnectShyft**
  - **Settings / More**
- **Resolver Queue remains inside People**, not as a top-level nav item

### OrgUnit context
- orgUnit selector is a persistent shell-level control
- users may switch orgUnit from anywhere in the shell
- orgUnit changes should preserve current page only when safe
- otherwise, route to the nearest valid landing state for the new orgUnit

### Subject/context bar
- the shell includes a persistent subject/context bar whenever a specific subject is active
- subject/context persists across People ↔ ConnectShyft when the same subject remains active
- subject/context should not persist across obviously incompatible routes or orgUnit switches

### Feature/module visibility
- unfinished modules are hidden entirely
- role-restricted surfaces are hidden unless visibility is operationally necessary

### Polish boundary
- Prep Step 3 includes **shell-level polish**
- Prep Step 3 does **not** include deep per-view redesign
- shell coherence comes first; detailed surface polish follows in a later prep step

---

## 3. Architectural Position (Locked)

Prep Step 3 is **not** a new app and **not** a full redesign of People or ConnectShyft.

The repo already contains:

- real shell-oriented routing structure
- real People and ConnectShyft views
- subject-context primitives
- orgUnit and feature-flag seams
- role-aware and module-aware behavior
- resolver work already centered in PeopleView
- contextual identity/rebind state already present in ConnectShyft thread detail

Prep Step 3 completes the missing top-level coherence layer:

> **one shared shell, one navigation model, one orgUnit model, one subject/context model, one visible application experience**

### Ownership model

- **Shell** owns top-level routing, nav, orgUnit control, subject/context continuity, and module visibility
- **People** remains the primary workspace for identity/resolver work
- **ConnectShyft** remains the communications workspace with contextual identity state
- **Feature flags / entitlements** continue to be backend-authoritative and frontend-consumed
- **Per-view business logic** stays in its existing modules; the shell must not absorb domain behavior

---

## 4. Problem This Slice Solves

Current repo state already has the core product logic, but the MVP still lacks a unified product container.

Without Prep Step 3:

- People and ConnectShyft still risk feeling like separate app surfaces
- top-level navigation and context continuity remain fragmented
- subject context can exist, but the shell is not yet the explicit home for it
- orgUnit switching lacks fully unified shell behavior
- feature/module visibility may still feel implementation-driven rather than product-driven
- further visual polish would risk being done inside the wrong frame

Prep Step 3 solves that by making the shell the authoritative top-level experience.

---

## 5. Domain and Deployment Target

### 5.1 Canonical MVP host

The unified application shell must be accessed via:

**`app.shyftunity.com`**

This host is the canonical entry point for the MVP shell.

### 5.2 Infrastructure implications

This requires real deployment coordination beyond repo code:

- **Cloudflare DNS**
  - create/update DNS for `app.shyftunity.com`
  - ensure it targets the correct origin/service
- **Nginx**
  - create/update server block / reverse proxy config for `app.shyftunity.com`
  - route the host to the correct application service
  - preserve SPA routing behavior if applicable
  - ensure TLS / forwarded headers / upstream behavior remain correct

### 5.3 Scope handling

Prep Step 3 implementation specs may include:
- deployment assumptions
- shell host expectations
- route/path assumptions based on the `app.shyftunity.com` domain

But this prep step is not a full ops runbook by default.  
If needed, deployment/server configuration work can be captured in a dedicated checkpoint or implementation companion.

---

## 6. Shared Shell Backbone (Locked)

### 6.1 One shell frame

The shell must provide one shared application frame for:
- top-level nav
- orgUnit selector
- subject/context bar
- page title / shell chrome
- role-aware module visibility
- consistent loading / empty / error framing at the shell layer

### 6.2 No fragmented local chrome

Prep Step 3 must reduce or eliminate duplicated top-level app chrome across People and ConnectShyft where that chrome belongs in the shared shell.

Examples of shell-owned concerns:
- top nav
- active module state
- orgUnit switcher
- shell-level headers
- cross-surface subject context
- shell-level empty/loading framing

Examples that remain local:
- People workspace internals
- ConnectShyft inbox/thread internals
- resolver queue details inside People
- thread-level communication tools inside ConnectShyft

### 6.3 Stable shell routing

The shell must unify route framing so that:
- People routes feel like one module inside the shell
- ConnectShyft routes feel like one module inside the shell
- moving between them does not feel like switching apps

---

## 7. Navigation Model (Locked)

### 7.1 Top-level nav

MVP top-level nav must include:
- **People**
- **ConnectShyft**
- **Settings / More**

### 7.2 Resolver Queue placement

Resolver Queue remains inside **People**, not top-level nav.

Reason:
- identity/resolver work belongs in People
- top-level nav should stay compact and product-clear
- a dedicated resolver top-level destination would prematurely flatten domain boundaries

### 7.3 Hidden unfinished modules

Modules that are not ready for MVP must be hidden entirely.
Do not show unavailable destinations just to hint at future scope.

### 7.4 Role-aware nav visibility

Shell nav must respect backend-authoritative role/entitlement truth.
Role-restricted items should be hidden unless their visibility is operationally necessary.

---

## 8. OrgUnit Context Model (Locked)

### 8.1 Persistent orgUnit control

The shell must provide a persistent orgUnit selector visible throughout the app where appropriate.

### 8.2 Shell-owned orgUnit truth

The shell owns the active orgUnit context for navigation and route framing, while backend services remain authoritative for what orgUnits the user may access.

### 8.3 Safe switch behavior

When orgUnit changes:
- preserve current page **only when safe**
- otherwise redirect to the nearest valid landing page for the new orgUnit/module

### 8.4 Safety rules

Examples of “not safe”:
- current person/thread does not exist or is not visible in the new orgUnit
- current route depends on subject context bound to the prior orgUnit
- current module is not enabled in the new orgUnit

In those cases, route to the closest valid destination rather than preserving broken context.

### 8.5 No stale orgUnit bleed

Subject context, module visibility, and page state must not continue to imply the old orgUnit after switch.

---

## 9. Subject/Context Unification (Locked)

### 9.1 Persistent subject/context bar

When a specific subject is in focus, the shell must show a subject/context bar.

At minimum, the bar should be able to reflect contract-backed context such as:
- subject identity summary
- identity state where relevant
- orgUnit context
- current linkage between People and ConnectShyft when the same subject is active

Exact displayed fields may follow repo capabilities, but the semantic role is locked.

### 9.2 Cross-module continuity

If the same subject remains active while moving between:
- People
- ConnectShyft

the shell should preserve subject/context continuity.

### 9.3 Safe clearing rules

The shell must clear or reset subject/context when:
- route changes to a non-subject page
- orgUnit switches invalidate current subject
- current subject is no longer valid for the destination surface
- backend truth indicates the previous subject context is stale or incompatible

### 9.4 Final truth, not stale identity

Subject/context bar must reflect current backend truth and must not preserve stale provisional or outdated subject assumptions after identity resolution/rebind.

---

## 10. Feature Flags and Module Visibility

### 10.1 Backend-authoritative visibility

Feature flags / entitlements remain backend-authoritative.
The shell consumes them and enforces product visibility accordingly.

### 10.2 MVP module rule

For MVP:
- show only modules that are live and intentionally available
- hide unfinished modules completely

### 10.3 Role-restricted surface rule

Hide role-restricted surfaces unless visibility itself is operationally necessary.

For example:
- normal users should not see resolver-only entry points if those belong inside People and are not relevant
- tenant-admin-only controls should appear only where needed and where backend authorization supports them

### 10.4 No fake “coming soon” destinations

Prep Step 3 should not introduce fake shell destinations for future product plans.

---

## 11. Shell-Level UX and Polish

### 11.1 Allowed polish

Prep Step 3 may improve:
- shell chrome consistency
- top-level nav clarity
- orgUnit selector clarity
- subject/context bar clarity
- shell-level loading / empty / error states
- removal of engineering-artifact framing from the top-level shell experience

### 11.2 Not yet in scope

Prep Step 3 does not deep-redesign:
- ConnectShyft inbox
- ConnectShyft thread detail internals
- People workspace internals
- resolver queue detail internals
- other future module views

### 11.3 THE_GOAL boundary

Prep Step 3 should move the app meaningfully closer to THE_GOAL at the shell level only.

---

## 12. Backend/API Requirements

Prep Step 3 must expose or finalize backend support for shell needs where not already stable, including as needed:

- current-user/session summary
- available orgUnits
- active feature/module visibility
- subject/context-safe summary payloads already used by People and ConnectShyft
- route-safe validation inputs for orgUnit and subject transitions

### API rule

Route handlers remain thin:
- authenticate/authorize
- validate transport shape
- call backend service
- return normalized result

The shell must not invent backend capability or visibility rules.

---

## 13. Frontend Requirements

### 13.1 Shell root and routing

The frontend must have one stable shell root that hosts:
- People routes
- ConnectShyft routes
- Settings / More routes

### 13.2 Shared shell state

The frontend must maintain shell-level state for:
- current module
- current orgUnit
- current subject/context when applicable
- module visibility / entitlement-backed nav

### 13.3 Route safety

The shell must guard against invalid transitions when:
- orgUnit changes
- subject becomes invalid
- module visibility changes
- backend truth invalidates current route assumptions

### 13.4 No duplicate local shell logic

People and ConnectShyft should not each continue owning their own top-level app-shell logic once the shared shell exists.

---

## 14. Tests (Required)

### Unit / Component tests

- shell nav shows only allowed MVP modules
- orgUnit selector renders and updates shell state correctly
- subject/context bar appears when valid subject is active
- subject/context bar clears when route/orgUnit invalidates it
- hidden modules do not appear
- role-restricted shell controls remain hidden when not allowed

### Integration tests

- user can navigate between People and ConnectShyft inside one shared shell
- orgUnit switch preserves current page when safe
- orgUnit switch redirects to nearest valid landing page when not safe
- subject/context persists across People ↔ ConnectShyft when same subject remains active
- subject/context is cleared or refreshed when backend truth invalidates it
- feature/module visibility correctly hides unfinished surfaces
- `app.shyftunity.com` assumptions are reflected in shell route/deployment expectations where applicable

### Regression / characterization

- Slice 2A and Slice 2B behavior remain intact inside the shell
- People remains the primary resolver workspace
- ConnectShyft remains the communications workspace with contextual identity state
- shell changes do not break resolver queue behavior, subject snapshot behavior, or thread contextual banners

---

## 15. Explicit Non-Goals

The following are out of scope for Prep Step 3:

- deep redesign of People or ConnectShyft local views
- CaseShyft readiness handoff work
- visible “coming soon” module stubs
- broad ops runbook beyond what is necessary to target `app.shyftunity.com`
- non-MVP modules in shell nav
- notifications/escalations unrelated to shell behavior
- global application redesign beyond shell/context unification

---

## 16. Done Criteria

Prep Step 3 is done only when:

- the unified application shell is designed around **`app.shyftunity.com`**
- People and ConnectShyft run inside one coherent shell
- shell navigation is stable and MVP-scoped
- orgUnit is a persistent shell control
- orgUnit switching is safe and route-aware
- subject/context persists across People ↔ ConnectShyft when appropriate
- subject/context clears when invalid
- hidden/unready modules are not exposed
- role-restricted shell surfaces remain appropriately hidden
- shell-level polish improves coherence without forcing deep per-view redesign

---

## 17. Recommended Checkpoint Shape

Prep Step 3 should likely be broken into these checkpoints:

1. **Shell backbone + top-level routing/chrome**
   - shell root
   - top-level nav
   - MVP-scoped module visibility
   - shell framing

2. **OrgUnit context + route safety**
   - persistent orgUnit selector
   - orgUnit switch logic
   - safe route preservation/reset behavior

3. **Subject/context unification across People ↔ ConnectShyft**
   - persistent subject/context bar
   - cross-module continuity
   - stale-context clearing and backend-truth refresh

4. **Feature flags / role visibility / shell cleanup**
   - hidden unfinished modules
   - role-aware shell surfaces
   - shell-level cleanup of engineering artifacts
   - shell-level tests and polish

Checkpoint count may be adjusted slightly if repo implementation suggests combining 1 and 4, but this is the recommended shape.

---

## 18. Locked Recommendation

Proceed next with:

> **Prep Step 3 — Checkpoint 1: shell backbone, top-level routing, and MVP-scoped module chrome**

Do not start with deep visual redesign of ConnectShyft or People internals before the shell itself is stable.

---

## 19. Implementation Intent

This is a **completion and hardening slice**, not a redesign.

Use the repo’s existing route structure, shell primitives, subject-context seams, feature-flag seams, and People/ConnectShyft module boundaries. Extend them into one coherent MVP shell at `app.shyftunity.com`. Do not introduce fake modules, a second shell model, or frontend-owned entitlement/context truth.
