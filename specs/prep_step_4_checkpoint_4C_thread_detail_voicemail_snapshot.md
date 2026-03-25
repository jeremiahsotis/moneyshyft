# CHECKPOINT 4C — THREAD DETAIL, VOICEMAIL, AND NEIGHBOR SNAPSHOT
**Slice:** Prep Step 4  
**Objective:** Make thread detail match THE_GOAL by centering the conversation, rendering voicemail as calm timeline content, and moving contextual metadata into a cleaner snapshot pattern at larger breakpoints

---

## 1. Goal

Transform thread detail so that:

- the conversation is the primary focus
- metadata does not pollute the timeline
- voicemail appears as a clear, usable timeline card
- mobile remains single-column and readable
- larger breakpoints expand into a right-side neighbor snapshot / context rail
- thread detail feels relational and humane, not technical

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
apps/connectshyft-web/src/features/connectshyft/*
apps/connectshyft-web/src/components/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/shell/*
```

Include adjacent thread/composer/timeline helpers as needed.

---

## 3. Required Changes

### 3.1 Conversation is the hero

The thread view must center:
- message timeline
- composer
- voicemail content
- current conversation actions

Rules:
- no metadata-heavy header stack dominating the view
- no internal status dumps in the timeline
- communication content remains primary

### 3.2 Voicemail becomes a calm timeline card

Voicemail must render as:
- a readable card inside the timeline
- clearly inbound or outbound
- with playback controls
- with transcript when available
- without technical/provider language

It must feel like conversation content, not an exception object.

### 3.3 Mobile-first thread layout

On mobile:
- single-column
- readable spacing
- action bar/composer reachable
- no right-rail dependency
- no dense metadata blocks

### 3.4 Larger breakpoint expansion

On laptop/desktop:
- preserve same design language
- expand into split-pane/right-rail pattern where appropriate
- contextual “Neighbor Snapshot” or equivalent sits outside the timeline
- metadata/context moves out of the conversation stream where possible

### 3.5 Subject snapshot and banner compatibility

The thread must continue to:
- show contextual unresolved-state banner when relevant (from Slice 2B / Step 3)
- reflect final truth in the subject snapshot

This checkpoint should visually integrate those elements better, not redesign their meaning.

### 3.6 Composer and action hierarchy

Thread-level actions (call, text, close, etc.) must feel:
- intentional
- clear
- mobile-first
- consistent with THE_GOAL visual language

### 3.7 Remove metadata pollution

Move or demote:
- internal claim/assignment wording
- route-like labels
- technical metadata that does not change user action
- stacked system chips that overpower the thread

Only keep context that changes what the user does.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:
- redesign backend telephony behavior
- redesign resolver workflow here
- introduce new call/SMS initiation surface here
- move resolver queue into ConnectShyft
- change thread/business logic beyond presentation-safe integration

---

## 5. Tests Required

### Unit / Component
- voicemail cards render correctly
- timeline remains readable on mobile
- snapshot/right-rail pattern appears only at larger breakpoints
- subject snapshot and banner still render correctly
- no technical/provider labels leak into user-facing cards

### Integration
- thread detail remains functional after restyle
- voicemail playback still works
- transcript still displays when available
- larger-breakpoint layout does not break mobile behavior

### Regression
- Slice 2B contextual banners still work
- telephony timeline data remains intact
- shell subject/context remains intact

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- thread detail clearly prioritizes conversation
- voicemail feels like normal timeline content
- mobile thread UX is calm and readable
- desktop expands into a cleaner snapshot/right-rail pattern
- metadata no longer pollutes the timeline
- the thread view visually aligns with THE_GOAL direction

---

## 7. Commit Boundary

```text
feat(connectshyft-web): restyle thread detail, voicemail, and snapshot surfaces for THE_GOAL UX
```

---

## 8. Verification Commands

```bash
rg "ThreadDetail|voicemail|timeline|snapshot|subject snapshot|banner|composer" apps/connectshyft-web/src
```

```bash
rg "provider|call_control_id|thread_id|tenant_id|debug|configured|mapped outbound" apps/connectshyft-web/src/views apps/connectshyft-web/src/features
```

```bash
rg "mobile|sm:|md:|lg:|xl:" apps/connectshyft-web/src/views/ConnectShyft apps/connectshyft-web/src/components
```

---

## 9. Outcome

After this checkpoint:

- thread detail feels like a real communication workspace
- voicemail becomes understandable and usable
- metadata is moved into better context surfaces
- the thread view is aligned with THE_GOAL’s core interaction philosophy
