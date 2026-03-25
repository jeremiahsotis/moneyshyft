# CHECKPOINT 4B — INBOX, MINE, DIRECTORY, AND SETTINGS SURFACES
**Slice:** Prep Step 4  
**Objective:** Convert the main list/workspace surfaces to THE_GOAL mobile-first UX so they feel calm, searchable, readable, and human-facing instead of administrative or engineering-heavy

---

## 1. Goal

Implement THE_GOAL treatment for:
- Inbox
- Mine
- Neighbor Directory
- Settings / More

so that:
- users can quickly understand who needs attention
- search is a primary interaction pattern
- cards feel readable and calm
- metadata is secondary and pill-based
- the app no longer feels like a backend tool

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/views/ConnectShyft/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/features/connectshyft/*
apps/connectshyft-web/src/components/*
apps/connectshyft-web/src/shell/*
```

Include adjacent route or view-model helpers as needed. Do not redesign thread detail in this checkpoint.

---

## 3. Required Changes

### 3.1 Inbox must prioritize attention and follow-up

Inbox should be redesigned to answer:
- who needs attention
- what happened
- what should the volunteer do next

Rules:
- card/list structure must be mobile-first
- metadata should be secondary
- statuses should be readable and consistent
- no engineering/admin language

### 3.2 Mine must feel like the same product, not a separate queue tool

Mine should:
- share the same visual grammar as Inbox
- clearly represent work that belongs to the current user
- avoid feeling like a separate admin workflow

### 3.3 Directory must be search-first and action-oriented

Directory should:
- prioritize search and lookup
- make it easy to find a person/contact quickly
- present profile/list cards cleanly
- keep “start conversation” or equivalent contact initiation visible where appropriate
- avoid dense database/table energy

### 3.4 Settings / More must be volunteer-safe

Settings / More should:
- be minimal
- use human language
- expose only MVP-safe settings/actions
- avoid surfacing internal app structure

### 3.5 Mobile-first list/card behavior

Across Inbox, Mine, Directory, and Settings:
- single-column mobile-first cards
- readable hierarchy
- tap-safe controls
- metadata chips, not raw grids
- desktop expansion may use more width, but same design language

### 3.6 Search-first interaction consistency

Where search exists:
- the visual/search pattern should be consistent
- search bars should follow the shared 4A primitives
- search must not feel bolted on differently in each surface

### 3.7 Empty / loading / no-result states must be coherent

Each surface must have:
- plain-language empty state
- loading state consistent with shell language
- no-result state where search applies

No debug or placeholder copy.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:
- redesign thread detail yet
- implement Conversation Launcher yet
- change backend queue/identity rules
- add new module destinations
- expose deep admin tooling in Settings

---

## 5. Tests Required

### Unit / Component
- Inbox/Mine/Directory/Settings cards render using shared primitives
- search fields are consistent
- role-safe Settings surface remains clean
- no debug/internal text leaks

### Integration
- Inbox and Mine remain functional while adopting new layout
- Directory lookup still works
- Settings remains reachable and stable inside shell
- responsive behavior is mobile-first across all four surfaces

### Regression
- resolver behavior inside People remains intact
- shell navigation remains intact
- no route regressions

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- Inbox, Mine, Directory, and Settings visually align with THE_GOAL direction
- these surfaces are mobile-first and calm
- search and card behavior are consistent
- no admin/dashboard energy or engineering artifacts remain on these surfaces
- users can clearly understand what needs attention and where to act

---

## 7. Commit Boundary

```text
feat(connectshyft-web): restyle inbox, mine, directory, and settings for THE_GOAL UX
```

---

## 8. Verification Commands

```bash
rg "Inbox|Mine|Directory|Settings|More|Search|Card|Chip|Badge" apps/connectshyft-web/src
```

```bash
rg "tenant_id|thread_id|person_id|debug|placeholder|configured|prototype" apps/connectshyft-web/src/views apps/connectshyft-web/src/features
```

```bash
rg "mobile|sm:|md:|lg:" apps/connectshyft-web/src/views apps/connectshyft-web/src/components
```

---

## 9. Outcome

After this checkpoint:

- the app’s primary list/workspace surfaces feel volunteer-safe and product-grade
- users can search, scan, and triage without admin-tool friction
- the app is visually much closer to THE_GOAL before thread-detail polish
