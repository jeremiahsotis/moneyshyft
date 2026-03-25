# PREP STEP 4 — IMPLEMENTATION BRIEF
**Title:** THE_GOAL UI, Interaction Polish, and Conversation Launcher (Mobile-First)

## 1. Objective

Deliver a **mobile-first, human-facing MVP UI** that matches THE_GOAL direction by:

- Applying a unified, calm design system across all surfaces
- Removing all engineering artifacts from user-facing UI
- Making ConnectShyft and People feel like one cohesive product
- Introducing a **Conversation Launcher (Call + SMS)** as a primary interaction surface
- Ensuring every interaction resolves cleanly into threads and the identity model

**Done =** A real user can confidently use the system without confusion, friction, or exposure to system internals.

---

## 2. Locked Product Decisions

### Mobile-first (non-negotiable)
- Mobile is the source layout
- Desktop is an expansion (split-pane, right rail), not a redesign
- If not mobile-first → blocked

### Conversation Launcher (Dialer replacement)
- Single surface for **Call + SMS**
- User selects target → chooses channel
- No auto-trigger
- Always resolves to thread
- Provisional identity created only after action if needed

### SMS behavior
- Launch → immediately enter thread
- Composer ready
- No pre-compose screen

### Recent contacts
- Only **logged-in user’s recent contacts**
- No tenant-wide or orgUnit-wide recents

### Visibility + language
- No engineering artifacts
- No IDs, debug labels, or system language
- Plain, human-readable UI

---

## 3. Scope Overview

Prep Step 4 converts:

Technically correct system  
→  
Human, trustworthy product

---

## 4. Slice Structure

### Slice 4A — Design System + Interaction Primitives
- Cards, pills, spacing, typography
- Buttons, search, empty states
- Mobile-first component system
- Shared across all surfaces

---

### Slice 4B — Inbox, Mine, Directory, Settings
- Convert list/workspace surfaces to THE_GOAL
- Search-first UX
- Clear attention signals
- Clean, readable cards
- Remove admin/dashboard feel

---

### Slice 4C — Thread Detail + Voicemail + Snapshot
- Conversation is primary
- Timeline cleaned and readable
- Voicemail = timeline card
- Desktop: right-side snapshot panel
- Remove metadata pollution

---

### Slice 4D — Content Cleanup + QA Pass
- Remove all engineering artifacts
- Normalize language
- Ensure accessibility
- Ensure responsive correctness
- No conflicting labels or stale states

---

### Slice 4E — Conversation Launcher (Call + SMS)
- Mobile-first interface
- Search or enter number
- Match existing or create provisional
- Call/Text selector
- Recent contacts (user-scoped only)
- Route into thread

---

## 5. Core Design Principles

### Conversation-first
- Timeline is the center of gravity
- Metadata is secondary

### Calm, readable UI
- Rounded surfaces
- Minimal noise
- Clear focus

### Identity-aware, not identity-heavy
- Show only what matters
- Hide system complexity

---

## 6. Backend Interaction Requirements

- All actions must:
  - respect ContactPoint model
  - respect identity resolution
  - attach to thread

- No orphan interactions

---

## 7. Frontend Requirements

- No duplicate logic paths
- No competing entry surfaces
- Consistent interaction model across app
- Shell remains authoritative container

---

## 8. Tests Required

### Unit
- components render correctly
- no debug strings
- mobile layouts valid

### Integration
- launcher creates/attaches thread correctly
- SMS and calls both work from launcher
- thread UI consistent
- no stale identity state

### Regression
- Prep Step 2B + 3 unaffected
- resolver flows intact
- telephony stable

---

## 9. Explicit Non-Goals

- No CaseShyft
- No analytics/dashboard
- No new modules
- No backend redesign

---

## 10. Done Criteria

- UI matches THE_GOAL direction
- Mobile-first across all surfaces
- Conversation Launcher fully functional
- No engineering artifacts visible
- System feels cohesive and safe

---

## 11. Next Step

Break into Codex checkpoints (4A–4E) and execute in order.
