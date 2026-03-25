# CHECKPOINT 2 — ORGUNIT CONTEXT AND ROUTE SAFETY
**Slice:** Prep Step 3  
**Objective:** Implement a persistent orgUnit context in the shared shell with safe switching behavior, including confirmation when switching would drop current subject/context or invalidate the current route

---

## 1. Goal

Enable orgUnit to function as a first-class shell control so that:

- orgUnit is always visible and switchable from the shell
- switching orgUnit is safe, predictable, and does not silently break context
- destructive switches (those that drop subject/context or invalidate route) require confirmation
- non-destructive switches happen immediately
- routing always resolves to a valid state after orgUnit change

This checkpoint establishes **context safety**, not feature expansion.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/shell/*
apps/connectshyft-web/src/components/*OrgUnit*.vue
apps/connectshyft-web/src/router/index.ts
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/*
```

---

## 3. Required Changes

### 3.1 Persistent orgUnit selector

The shell must expose a persistent orgUnit selector:

- visible across all primary routes
- reflects current orgUnit from backend/session
- updates shell state when changed

---

### 3.2 Shell-owned orgUnit state

Frontend must maintain:

- current orgUnit id
- available orgUnits (from backend)
- derived “safe route” evaluation state

Backend remains authoritative for:
- which orgUnits are available
- access permissions

---

### 3.3 Safe vs destructive switch evaluation

Before switching orgUnit, evaluate:

#### SAFE switch (no confirmation)
- current route is valid in target orgUnit
- subject/context (if present) still valid
- module remains available

#### DESTRUCTIVE switch (confirmation required)
- subject/context will be cleared
- current person/thread not available in new orgUnit
- module not available in new orgUnit
- route cannot be preserved

---

### 3.4 Confirmation behavior (locked)

If switch is destructive:

Show modal:

**Title:** Switch orgUnit?  
**Body:** This will clear the current person or conversation and take you to the nearest available page in the selected orgUnit.

Buttons:
- Switch orgUnit (primary)
- Cancel

Rules:
- no engineering terms
- no IDs or debug language
- no silent destructive switches

---

### 3.5 Switch execution rules

#### Safe switch
- apply immediately
- preserve route
- preserve subject/context

#### Destructive switch (after confirmation)
- clear subject/context
- redirect to nearest valid landing route:
  - `/people` if person-related
  - `/connect` if communication-related
  - fallback to `/people` if uncertain

---

### 3.6 Route safety enforcement

After switching:

- ensure route is valid for:
  - orgUnit
  - module visibility
  - subject/context

If invalid:
- redirect to nearest valid route
- never leave user on broken route

---

### 3.7 Subject/context clearing rules

On destructive switch:

- clear subject/context immediately
- do not carry stale identity state
- do not attempt partial reuse

---

### 3.8 No backend leakage

Frontend must not infer orgUnit safety via:
- string matching
- missing data heuristics

Use contract-backed data only.

---

### 3.9 Preserve shell authority

OrgUnit switching must remain:

- shell-controlled
- backend-authorized
- not duplicated inside modules

---

## 4. Explicit Non-Changes

Do not:

- implement subject/context bar yet
- redesign People or ConnectShyft
- add feature flags logic here
- expose resolver controls
- change backend permission model

---

## 5. Tests Required

### Unit

- orgUnit selector renders correctly
- safe switch executes immediately
- destructive switch triggers confirmation
- cancel prevents switch
- confirm executes switch

### Integration

- safe switch preserves route and subject/context
- destructive switch clears subject/context and redirects
- invalid routes after switch are corrected
- switching orgUnit does not produce inconsistent state

### Regression

- Slice 2B behavior remains intact
- shell routing remains stable
- no silent context loss occurs

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- orgUnit selector is persistent and functional
- safe vs destructive switch logic is enforced
- destructive switches require confirmation
- subject/context is cleared correctly when required
- routing remains valid after switch
- no silent context loss occurs

---

## 7. Commit Boundary

```text
feat(connectshyft-web): add orgUnit context with safe switching and confirmation
```

---

## 8. Verification Commands

```bash
rg "orgUnit|switch|selector|context|route safety|confirmation" apps/connectshyft-web
```

```bash
rg "orgUnit|tenant|permission" apps/connectshyft-api libs/contracts
```

---

## 9. Outcome

After this checkpoint:

- orgUnit is a stable shell-level concept
- switching orgUnit is safe and predictable
- users are protected from accidental context loss
- system is ready for subject/context unification
