# CHECKPOINT 4D — CONTENT CLEANUP, ENGINEERING-ARTIFACT PURGE, AND RESPONSIVE QA
**Slice:** Prep Step 4  
**Objective:** Remove all remaining engineering energy from user-facing surfaces, normalize language across the app, and perform a mobile-first responsive and clarity QA pass

---

## 1. Goal

Finalize the product language and polish layer so that:

- no engineering artifacts remain visible anywhere in user-facing UI
- labels and statuses are normalized across People, ConnectShyft, and shell surfaces
- mobile-first quality is verified across breakpoints
- accessibility and readability issues are corrected
- stale or contradictory labels do not remain after the visual restyle

This is the finishing content/QA slice that turns styled screens into trustworthy screens.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/views/*
apps/connectshyft-web/src/components/*
apps/connectshyft-web/src/shell/*
apps/connectshyft-web/src/features/*
apps/connectshyft-web/src/router/*
```

Include any adjacent copy/config files as needed.

---

## 3. Required Changes

### 3.1 Remove all engineering artifacts

Purge all remaining user-facing:
- IDs
- debug strings
- provider/internal system terms
- placeholder copy
- design-note or prototype language
- admin/developer helper text not meant for real users

Examples include patterns like:
- mapped/configured/internal state phrases
- raw resolver/rebind internals
- implementation vocabulary leaking into UI

### 3.2 Normalize user-facing vocabulary

Unify language for concepts such as:
- new / needs attention / follow-up
- claimed / mine / assigned
- voicemail received / voicemail left
- unresolved / needs review / provisional
- failed / pending / completed
- close / archive / done / resolve

The user should not encounter multiple competing vocabularies for the same concept.

### 3.3 Mobile-first responsive QA

Verify all user-facing surfaces:
- work on mobile first
- have readable spacing and hierarchy
- avoid tiny controls
- avoid hover-only assumptions
- scale to tablet/laptop/desktop without becoming a different product

### 3.4 Accessibility and readability pass

At minimum:
- check tap target size
- check contrast and readability
- check button/action clarity
- check empty/error/loading state clarity
- ensure no hidden critical meaning in subtle styling alone

### 3.5 Remove contradictory or stale labels

Ensure:
- resolved items do not keep unresolved labels
- final truth replaces stale provisional language
- shell/module/status labels do not contradict backend truth
- queue, banner, and snapshot language stays coherent

### 3.6 No page-specific drift

This checkpoint must review the app holistically:
- shell
- People
- ConnectShyft
- launcher (once added)
- thread detail
- settings

and eliminate inconsistent product tone or terminology.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:
- redesign backend logic
- add new features
- change route architecture
- add analytics or dashboards
- broaden module scope

---

## 5. Tests Required

### Unit / Snapshot / Content-focused
- no debug/internal strings remain in user-facing renders
- normalized labels render consistently
- mobile layouts remain intact

### Integration
- responsive behavior remains correct across shell and key views
- role-appropriate content still hides resolver/admin internals from normal users
- final truth replaces stale provisional labels after resolution/rebind

### Regression
- prior Prep Step 4 checkpoints remain intact
- Slice 2B and Prep Step 3 behaviors remain stable
- no hidden UI regressions from content cleanup

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- no engineering artifacts remain visible anywhere user-facing
- language is normalized across the app
- mobile-first QA is complete and issues are fixed
- the app reads like one human product rather than stitched modules

---

## 7. Commit Boundary

```text
feat(connectshyft-web): remove engineering artifacts and finalize mobile-first content polish
```

---

## 8. Verification Commands

```bash
rg "tenant_id|thread_id|person_id|debug|placeholder|configured|mapped outbound|prototype|internal|provider" apps/connectshyft-web/src
```

```bash
rg "needs attention|follow-up|claimed|mine|assigned|voicemail|provisional|needs review|failed|pending|completed|archive|resolve" apps/connectshyft-web/src
```

```bash
rg "mobile|sm:|md:|lg:|xl:" apps/connectshyft-web/src
```

---

## 9. Outcome

After this checkpoint:

- the app no longer leaks engineering energy
- users experience coherent, human-facing language
- mobile-first quality is verified across the MVP
- the product feels trustworthy instead of merely functional
