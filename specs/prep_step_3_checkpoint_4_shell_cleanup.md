# CHECKPOINT 4 — FEATURE FLAGS, ROLE VISIBILITY, AND SHELL CLEANUP
**Slice:** Prep Step 3  
**Objective:** Finalize MVP shell coherence by enforcing backend-driven feature/module visibility, role-based access at the shell layer, and removing engineering artifacts from user-facing UI

---

## 1. Goal

- Shell shows only MVP-allowed modules (People, ConnectShyft, Settings/More)
- Visibility is **backend-authoritative** (feature flags / entitlements)
- Role-restricted surfaces are hidden or disabled appropriately
- All engineering artifacts are removed from user-facing shell chrome
- Loading/empty/error states are consistent at the shell level
- The app feels like one product at `app.shyftunity.com`

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/shell/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/components/*Nav*.vue
apps/connectshyft-web/src/components/*Layout*.vue
apps/connectshyft-web/src/router/index.ts
apps/connectshyft-web/src/features/* (feature flags / permissions)
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/* (feature flags / permissions)
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/*
```

---

## 3. Required Changes

### 3.1 Backend-authoritative feature flags

- Consume feature flags / entitlements from backend
- Do not invent visibility rules in frontend
- Normalize into a single shell-consumable shape

---

### 3.2 MVP module visibility enforcement

Shell must render exactly:
- People
- ConnectShyft
- Settings / More

Rules:
- hide all other modules completely
- no “coming soon” placeholders
- no dev-only routes exposed in UI

---

### 3.3 Role-based visibility

- Tenant-admin-only controls remain hidden for non-admin users
- Resolver-only affordances stay inside People (and only when applicable)
- Do not expose role internals in UI

---

### 3.4 Route gating

Before rendering a route, validate:
- module is enabled
- user has access
- orgUnit allows it

If invalid:
- redirect to nearest valid landing page
- never render a broken or unauthorized surface

---

### 3.5 Shell cleanup — remove engineering artifacts

Remove from all shell-level UI:
- IDs (tenant_id, person_id, thread_id)
- debug labels
- internal notes (e.g., “mapped outbound number configured”)
- instructional or placeholder text intended for developers

Replace with:
- plain-language labels
- clean status indicators
- no leakage of internal system concepts

---

### 3.6 Consistent shell states

Shell must own:

- loading states between module transitions
- empty states when no data
- error states when routes or data fail

Rules:
- no blank screens
- no raw error dumps
- no module-specific inconsistent patterns at top level

---

### 3.7 Navigation polish

- active module clearly indicated
- nav is visually consistent across all routes
- no duplication between modules
- no shifting layout between People and ConnectShyft

---

### 3.8 Subject/context compatibility

- subject/context continues to work
- no visual conflicts with shell cleanup
- no stale identity labels after resolution

---

### 3.9 Accessibility and clarity

- buttons and nav items clearly labeled
- consistent interaction patterns
- no ambiguous actions

---

## 4. Explicit Non-Changes

Do not:

- redesign People or ConnectShyft internals
- add new modules
- introduce notification systems
- add visible resolution history
- change backend permission model

---

## 5. Tests Required

### Unit

- only allowed nav items render
- hidden modules do not appear
- role-based controls hidden correctly
- no debug/ID strings in UI output

### Integration

- unauthorized routes redirect safely
- feature flags control visibility correctly
- switching modules maintains shell consistency
- no engineering artifacts appear anywhere in shell

### Regression

- Slice 2B behavior intact
- subject/context behavior intact
- routing and orgUnit switching intact

---

## 6. Stop Condition (MANDATORY)

- shell shows only MVP modules
- role visibility enforced
- no engineering artifacts visible
- routing gated correctly
- shell UI is clean, consistent, and user-safe

---

## 7. Commit Boundary

```text
feat(connectshyft-web): enforce feature flags, role visibility, and clean shell UI for MVP
```

---

## 8. Verification Commands

```bash
rg "tenant_id|thread_id|person_id|debug|placeholder" apps/connectshyft-web
```

```bash
rg "feature|flag|permission|role" apps/connectshyft-web apps/connectshyft-api libs/contracts
```

---

## 9. Outcome

After this checkpoint:

- shell is production-safe
- no internal artifacts leak to users
- module visibility is correct
- app feels cohesive and complete at MVP level
