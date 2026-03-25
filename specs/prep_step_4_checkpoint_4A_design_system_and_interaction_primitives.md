# CHECKPOINT 4A — MOBILE-FIRST DESIGN SYSTEM AND INTERACTION PRIMITIVES
**Slice:** Prep Step 4  
**Objective:** Establish the shared mobile-first visual language and interaction primitives required to implement THE_GOAL UI consistently across People, ConnectShyft, and the shell

---

## 1. Goal

Create a shared, mobile-first design system layer so that:

- all primary surfaces use one calm, rounded, volunteer-first visual language
- mobile is the source layout
- desktop and larger breakpoints are expansions, not redesigns
- cards, chips, buttons, search, segmented controls, empty states, and action bars behave consistently
- later Prep Step 4 checkpoints can style screens without drifting from THE_GOAL

This checkpoint is about **shared UI grammar**, not individual screen completion.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/components/*
apps/connectshyft-web/src/shell/*
apps/connectshyft-web/src/styles/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/views/ConnectShyft/*
apps/connectshyft-web/src/features/*
```

Include adjacent design-token, utility-class, or shared component files as needed. Do not deeply redesign feature-specific logic in this checkpoint.

---

## 3. Required Changes

### 3.1 Mobile-first design system is mandatory

All shared primitives must be authored mobile-first:
- single-column first
- large tap targets
- touch-safe spacing
- readable type hierarchy
- no desktop-first compression patterns

Desktop behavior may be added through larger breakpoints, but mobile remains the source layout.

### 3.2 Lock the shared visual grammar

Create/finalize shared primitives for:
- rounded cards
- pill/chip metadata
- buttons and action groups
- segmented controls/tabs
- search inputs
- text inputs / composers
- empty states
- loading states
- shell-safe error states
- section headers and secondary labels

Visual direction must align to THE_GOAL:
- calm
- soft
- rounded
- readable
- volunteer-first
- not “enterprise admin dashboard”

### 3.3 Typography and spacing must be consistent

Add/finalize:
- spacing rhythm
- mobile-first heading/body hierarchy
- metadata sizing rules
- card padding rules
- action spacing rules

Do not allow each feature surface to invent its own sizing language.

### 3.4 Status and badge language primitives

Create/finalize shared status display treatment for things like:
- new / needs attention
- voicemail
- claimed / mine
- unresolved / provisional / needs review
- completed / failed / pending where appropriate

Rules:
- visual system must be consistent
- wording must be human-facing
- no backend/internal status leakage

### 3.5 Shared responsive behavior patterns

Define and implement shared responsive behavior for:
- mobile single-column
- tablet expansion
- laptop/desktop split-pane where already planned
- right-rail/panel primitives for larger breakpoints

This checkpoint should add the underlying primitives so later checkpoints can use them without inventing ad hoc layout logic.

### 3.6 Remove component-level engineering styling debt

Replace:
- cramped admin-table energy
- inconsistent badge stacks
- harsh/dense metadata groupings
- debug-looking placeholder components

With shared calm, readable components.

### 3.7 Keep module logic out of the design layer

This checkpoint must not:
- move business logic into design primitives
- embed resolver logic in shared components
- encode route-specific behavior in tokens/components

It should only standardize presentation and reusable interaction patterns.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:
- complete Inbox/Mine/Directory/Settings screens yet
- redesign thread detail yet
- implement Conversation Launcher yet
- change backend behavior
- add new module routes
- invent future-only themes or variants

---

## 5. Tests Required

### Unit / Component
- shared primitives render correctly on mobile
- shared primitives remain usable at larger breakpoints
- button, card, chip, input, and empty-state components are consistent
- no debug/internal strings are baked into shared components

### Integration / Visual Regression
- shell and existing pages can adopt shared primitives without layout breakage
- responsive behavior does not collapse into desktop-first density
- no component introduces inaccessible tap targets or unreadable spacing on mobile

### Regression
- Prep Step 3 shell remains intact
- current People and ConnectShyft routes still render after adopting primitives
- no business logic regressions from presentation refactor

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- a shared mobile-first design grammar exists
- all later Prep Step 4 surfaces can consume the same visual primitives
- responsive behavior is mobile-first and stable
- design primitives no longer leak engineering/dashboard energy
- the app has one coherent UI language at the component level

---

## 7. Commit Boundary

```text
feat(connectshyft-web): add mobile-first design system and shared interaction primitives
```

---

## 8. Verification Commands

```bash
rg "Card|Chip|Badge|Button|Search|Empty|Segment|Tab|Layout|Panel|Rail" apps/connectshyft-web/src
```

```bash
rg "mobile|sm:|md:|lg:|xl:|breakpoint|responsive" apps/connectshyft-web/src
```

```bash
rg "tenant_id|thread_id|person_id|debug|placeholder" apps/connectshyft-web/src/components apps/connectshyft-web/src/styles
```

---

## 9. Outcome

After this checkpoint:

- the app has a shared mobile-first UI grammar
- later Prep Step 4 slices can implement THE_GOAL without drifting
- the product stops looking like stitched-together internal tools at the component level
