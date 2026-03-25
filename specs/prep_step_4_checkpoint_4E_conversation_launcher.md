# CHECKPOINT 4E — CONVERSATION LAUNCHER (CALL + SMS) WITH USER-SCOPED RECENT CONTACTS
**Slice:** Prep Step 4  
**Objective:** Introduce a mobile-first Conversation Launcher that supports both Call and SMS, routes all new outbound interactions into threads, and uses logged-in-user-scoped recent contacts

---

## 1. Goal

Replace the concept of a standalone dialer with a **Conversation Launcher** so that:

- users can start either a Call or a Text from one surface
- target selection happens before channel choice
- all interactions attach to an existing thread or create a new one
- unknown numbers can be contacted immediately and resolved into provisional identity after action starts
- recent contacts are scoped to the logged-in user only
- the launcher is mobile-first and consistent with THE_GOAL visual language

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/views/ConnectShyft/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/features/connectshyft/*
apps/connectshyft-web/src/components/*
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/connectshyft/*
apps/connectshyft-api/src/modules/peoplecore/*
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/*
```

Include adjacent launcher/composer/search helpers as needed.

---

## 3. Required Changes

### 3.1 One conversation-launch surface for Call + SMS

The launcher must be a single surface for starting outbound communication.

It must not be split into:
- a separate dialer
- a separate new-message screen

The launcher owns:
- target lookup/entry
- recent contacts
- channel selection (Call or Text)

### 3.2 Target selection happens before channel choice

Required flow:
1. user searches/selects/enters target
2. system resolves known contact/person if possible
3. user explicitly chooses:
   - Call
   - Text

Do not:
- auto-call
- auto-text
- default silently to a channel

### 3.3 User-scoped recent contacts only

Recent contacts must mean:
- the **logged-in user’s** recent contacts only

Not allowed:
- tenant-wide recents
- orgUnit-wide recents
- shared team recents

The launcher must not leak other users’ recents or create a misleading shared-recency model.

### 3.4 Known match behavior

If a typed number or selected target matches an existing ContactPoint/person:
- use the existing identity/thread model
- open existing thread where appropriate or create the correct new thread attachment path
- preserve conversation continuity

### 3.5 Unknown number behavior (locked MVP decision)

If no match exists:
- allow Call or Text immediately
- create provisional identity only after action begins
- do not block the interaction with a “save person first” requirement

This applies to both:
- outbound call
- outbound SMS

### 3.6 Thread-first outcome is mandatory

Every launcher action must:
- attach to an existing thread, or
- create a new thread

Forbidden:
- orphan calls
- orphan SMS starts
- detached launcher-only logs

### 3.7 SMS launch behavior

When user chooses **Text**:
- route directly into the thread
- open with composer ready
- no pre-compose launcher screen beyond target/channel selection

### 3.8 Call launch behavior

When user chooses **Call**:
- launch call flow through existing telephony/conversation model
- resulting call events must still land in the thread/timeline
- no separate call-log-only experience

### 3.9 Mobile-first launcher UX

The launcher must be mobile-first:
- thumb-friendly
- minimal steps
- large tap targets
- clear search/input hierarchy
- recent contacts visible without overwhelming the screen
- keypad-like behavior only if needed, but not as the primary mental model

This is a **conversation launcher**, not a generic phone keypad.

### 3.10 Desktop expansion

At larger breakpoints:
- launcher may appear as a modal, panel, or expanded sheet
- it must preserve the same design language as mobile
- it must not become a separate desktop-only interaction model

### 3.11 Engineering-language purge

The launcher must not expose:
- ContactPoint jargon
- provisional identity jargon
- backend thread IDs
- route/debug labels
- internal matching terminology

Use plain language:
- name
- phone number
- recent contact
- call
- text

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:
- redesign backend telephony runtime
- redesign thread composer beyond entry behavior needed for Text launch
- add shared/team recent-contact logic
- add advanced contact management features
- add a separate new-message surface

---

## 5. Tests Required

### Unit / Component
- launcher shows target search/entry and channel choice
- recent contacts are user-scoped only
- known target selection behaves correctly
- unknown number path remains available
- no engineering/internal language leaks into launcher UI

### Integration
- Call launch creates or attaches to a thread correctly
- Text launch creates or attaches to a thread correctly
- unknown number call triggers provisional identity after action begins
- unknown number text triggers provisional identity after action begins
- recent contacts returned/rendered are only for logged-in user
- launcher remains mobile-first and functional at larger breakpoints

### Regression
- existing thread/timeline behavior remains intact
- telephony and SMS runtime behavior remain intact
- identity resolution rules remain intact
- no orphan interactions are introduced

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- one Conversation Launcher supports both Call and SMS
- target is selected before channel choice
- every outbound interaction attaches to or creates a thread
- unknown numbers can be contacted immediately with provisional identity created after action begins
- recent contacts are scoped only to the logged-in user
- launcher is mobile-first and aligned with THE_GOAL language

---

## 7. Commit Boundary

```text
feat(connectshyft-web): add mobile-first conversation launcher for call and sms
```

---

## 8. Verification Commands

```bash
rg "dialer|launcher|conversation launcher|call|text|recent contacts|recentContacts" apps/connectshyft-web/src apps/connectshyft-api/src libs/contracts
```

```bash
rg "tenant-wide|orgUnit-wide|shared recents|recent contacts" apps/connectshyft-web/src apps/connectshyft-api/src
```

```bash
rg "thread|create thread|attach thread|provisional|ContactPoint|phone" apps/connectshyft-web/src apps/connectshyft-api/src libs/contracts
```

---

## 9. Outcome

After this checkpoint:

- starting a new conversation is clean, fast, and mobile-first
- Call and SMS share one coherent launch model
- all outbound interactions remain thread-first
- recent contacts are correctly scoped to the current user
- the last major MVP interaction gap is closed
