# CHECKPOINT 1 — SHELL BACKBONE, TOP-LEVEL ROUTING, AND MVP-SCOPED MODULE CHROME
**Slice:** Prep Step 3  
**Objective:** Establish the unified application shell at `app.shyftunity.com` with one shared layout, stable top-level routing, MVP-scoped navigation, and domain-aware deployment assumptions

---

## 1. Goal

Create the shell backbone so that:

- the app runs under **`app.shyftunity.com`** as the canonical host
- People and ConnectShyft render inside a single shared shell frame
- top-level navigation is unified and MVP-scoped
- module visibility is controlled and not implementation-leaky
- shell-level layout replaces fragmented per-module chrome
- the system is ready for orgUnit and subject-context layering in later checkpoints

This checkpoint is about **structure and containment**, not deep feature work.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/main.ts
apps/connectshyft-web/src/App.vue
apps/connectshyft-web/src/router/index.ts (or equivalent)
apps/connectshyft-web/src/routes.ts (or equivalent)
apps/connectshyft-web/src/shell/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/components/*Nav*.vue
apps/connectshyft-web/src/components/*Layout*.vue
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/*
```

Include adjacent shell/layout/router helpers only as needed. Do not refactor unrelated feature modules.

---

## 3. Required Changes

### 3.1 Establish canonical shell root

The app must have a single shell root that:

- wraps all primary routes
- owns:
  - top-level navigation
  - layout frame
  - module switching
  - shell-level loading/empty states
- renders People and ConnectShyft as children

If multiple competing layout roots exist:
- consolidate to one shell root
- remove duplicated top-level chrome from child modules

---

### 3.2 Route everything under the shell

All primary routes must render inside the shell:

Required top-level route grouping:

```text
/
  ├── /people
  ├── /connect
  └── /settings (or /more)
```

Rules:
- no standalone People or ConnectShyft routes outside the shell
- no “bypass” routes that skip shell layout
- shell must be the consistent parent for all MVP surfaces

---

### 3.3 Lock MVP navigation model

Shell must render exactly:

- **People**
- **ConnectShyft**
- **Settings / More**

Required behavior:
- no additional modules shown
- no placeholder/coming-soon modules
- no resolver queue top-level nav

Resolver Queue remains inside People.

---

### 3.4 Remove fragmented module-level chrome

If People or ConnectShyft currently render their own:

- top nav
- headers
- app frame
- module switchers

Then:

- remove or demote those elements
- move ownership to shell where appropriate

Child views should assume:
- they are inside a shell
- they do not own global layout

---

### 3.5 Enforce MVP module visibility

Shell must:

- show only People, ConnectShyft, Settings
- hide all unfinished modules completely
- not rely on frontend-only flags to guess availability

If feature flags exist:
- use them as backend-authoritative inputs
- do not invent visibility rules in the UI

---

### 3.6 Domain-aware routing assumptions

The shell must be designed to run at:

**`https://app.shyftunity.com`**

Required implications:

- no hardcoded localhost-only assumptions
- no pathing assumptions tied to legacy hosts
- routing must work correctly when served from root `/`
- SPA fallback must be assumed (handled by Nginx)

---

### 3.7 Nginx + Cloudflare awareness (design-level)

This checkpoint must assume:

#### Nginx
- server block for `app.shyftunity.com`
- reverse proxy to app service
- SPA fallback (`try_files $uri /index.html`)
- correct forwarded headers

#### Cloudflare
- DNS entry for `app.shyftunity.com`
- proxied or DNS-only depending on environment

You are **not** implementing infra here, but:
- routing must be compatible with this setup
- no code should assume a different host

---

### 3.8 Shell-level loading and error states

Shell must provide consistent:

- loading state when switching modules
- fallback UI when route is invalid
- guard against blank screens during route transitions

Do not leave loading/error behavior fragmented per module.

---

### 3.9 Preserve existing module internals

Do not:

- rewrite People internals
- rewrite ConnectShyft internals
- move business logic into shell

Shell only:
- contains
- routes
- frames

---

### 3.10 Prepare for next checkpoints

Shell must expose extension points for:

- orgUnit selector (Checkpoint 2)
- subject/context bar (Checkpoint 3)
- feature flags cleanup (Checkpoint 4)

Do not implement those yet, but ensure layout supports them.

---

## 4. Explicit Non-Changes

Do not:

- implement orgUnit switching yet
- implement subject/context bar yet
- redesign ConnectShyft or People UI
- expose resolver queue in nav
- add placeholder modules
- redesign auth/session system
- introduce frontend-only routing logic that conflicts with backend truth

---

## 5. Tests Required

### Unit / Component

- shell renders nav with exactly People, ConnectShyft, Settings
- shell wraps all routes
- module-level chrome is not duplicated
- hidden modules do not render

### Integration

- navigating between People and ConnectShyft stays within one shell
- direct navigation to `/people` or `/connect` loads inside shell
- invalid routes fall back to shell-safe state
- routing works without reload loops under SPA assumptions

### Regression

- existing PeopleView behavior still works inside shell
- existing ConnectShyft thread/detail behavior still works
- Slice 2B resolver behavior is unaffected

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- all primary routes render inside one shared shell
- nav shows only People, ConnectShyft, Settings
- no duplicate top-level chrome exists in child modules
- routing works cleanly under `app.shyftunity.com` assumptions
- shell-level layout is stable and consistent

---

## 7. Commit Boundary

```text
feat(connectshyft-web): establish unified shell backbone and routing at app.shyftunity.com
```

---

## 8. Verification Commands

```bash
rg "Shell|Layout|Nav|router|routes|People|ConnectShyft" apps/connectshyft-web
```

Confirm:
- single shell root
- unified routing

```bash
rg "People|ConnectShyft|Settings|More" apps/connectshyft-web
```

Confirm:
- nav is MVP-scoped

```bash
rg "localhost|127.0.0.1" apps/connectshyft-web
```

Confirm:
- no hardcoded host assumptions

---

## 9. Outcome

After this checkpoint:

- the app has a real, unified shell
- People and ConnectShyft feel like one application
- routing and layout are stable
- the system is ready for orgUnit and subject/context layering in subsequent checkpoints
