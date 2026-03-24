# CHECKPOINT 1 — STATE MACHINE LOCK
**Slice:** Prep Step 1  
**Objective:** Enforce BridgeSession as the single telephony runtime authority with monotonic, non-regressing state transitions

## 1. Goal

Lock a **deterministic, monotonic state machine** for BridgeSession so that:

- No provider event can regress state
- No duplicate or out-of-order webhook can corrupt runtime state
- BridgeSession becomes the **only telephony runtime source of truth**
- Call lifecycle and webhook handlers cannot mutate state outside controlled transitions

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts
apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

---

## 3. Required Changes

### 3.1 Define Canonical State Enum (single source)

In `bridgeSessions.ts`, define:

```ts
export const BridgeSessionState = {
  INITIATED: 'initiated',
  OPERATOR_DIALING: 'operator_dialing',
  OPERATOR_ANSWERED: 'operator_answered',
  NEIGHBOR_DIALING: 'neighbor_dialing',
  NEIGHBOR_ANSWERED: 'neighbor_answered',
  BRIDGED: 'bridged',
  VOICEMAIL: 'voicemail',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
  EXPIRED: 'expired'
} as const;
```

### 3.2 Add Transition Map (no implicit transitions allowed)

```ts
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  initiated: ['operator_dialing', 'failed', 'canceled'],
  operator_dialing: ['operator_answered', 'failed', 'expired'],
  operator_answered: ['neighbor_dialing', 'failed'],
  neighbor_dialing: ['neighbor_answered', 'voicemail', 'failed'],
  neighbor_answered: ['bridged', 'failed'],
  bridged: ['completed', 'failed'],
  voicemail: ['completed'],
  completed: [],
  failed: [],
  canceled: [],
  expired: []
};
```

### 3.3 Create Central Transition Function (MANDATORY)

In `bridgeSessions.ts`:

```ts
export function transitionBridgeSessionState(
  session: BridgeSession,
  nextState: string,
  context: {
    source: 'provider' | 'system' | 'user',
    eventType?: string
  }
): BridgeSession {
  const currentState = session.status;

  if (currentState === nextState) return session;

  const allowed = ALLOWED_TRANSITIONS[currentState] || [];
  if (!allowed.includes(nextState)) {
    return session;
  }

  return {
    ...session,
    status: nextState,
    updated_at: new Date().toISOString()
  };
}
```

### 3.4 Replace ALL Direct State Mutations

Search and replace patterns:

```text
session.status =
UPDATE cs_bridge_sessions SET status =
```

Replace with calls to:

```text
transitionBridgeSessionState(...)
```

This applies to:

- `callLifecycle.ts`
- `inboundVoice.ts`
- `voicemails.ts`
- webhook handlers in `connectshyft.ts`

### 3.5 Provider Event Mapping MUST route through lifecycle layer

In `callLifecycle.ts`, enforce:

```ts
function handleProviderEvent(event) {
  const session = getSession(event);
  const nextState = mapProviderEventToState(event);

  return transitionBridgeSessionState(session, nextState, {
    source: 'provider',
    eventType: event.type
  });
}
```

### Required mapping behavior

| Provider Event | Target State |
|---|---|
| call.initiated | initiated |
| call.ringing | operator_dialing / neighbor_dialing |
| call.answered | *_answered |
| call.bridged | bridged |
| call.hangup (pre-bridge) | failed |
| call.hangup (post-bridge) | completed |
| recording.saved (voicemail) | voicemail |

### 3.6 Voicemail MUST be terminal for unanswered flows

In `inboundVoice.ts` and `voicemails.ts`:

- Ensure voicemail transition occurs only from `neighbor_dialing`
- Disallow:
  - `failed -> voicemail`
  - `completed -> voicemail`

### 3.7 Prevent State Regression (CRITICAL GUARD)

Add global rule inside transition function:

```ts
const TERMINAL_STATES = ['completed', 'failed', 'canceled', 'expired'];

if (TERMINAL_STATES.includes(currentState)) {
  return session;
}
```

### 3.8 Logging (minimal, non-noisy)

Add debug-level log only for rejected transitions:

```ts
log.debug({
  message: 'Rejected state transition',
  currentState,
  attemptedState: nextState,
  context
});
```

No user-facing exposure.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- Introduce new state names
- Add SIP-related logic
- Modify voicemail schema
- Add retry logic
- Change thread/timeline behavior
- Modify rebind logic
- Introduce UI changes

---

## 5. Tests Required

### Unit

- valid transitions succeed
- invalid transitions are ignored
- terminal states cannot transition
- duplicate transition is idempotent

### Integration

- provider event replay does not change final state
- out-of-order events do not regress state

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- All BridgeSession state mutations route through `transitionBridgeSessionState`
- No direct `status` mutation exists anywhere in repo
- Duplicate webhook replay produces identical final state
- Out-of-order provider events do not change final state
- Voicemail cannot be entered from invalid states
- Terminal states cannot transition

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): lock bridge session state machine and enforce monotonic transitions
```

---

## 8. Verification Commands

Run:

```bash
rg "status =" apps/connectshyft-api
```

Must return **zero direct mutations**.

Run:

```bash
rg "transitionBridgeSessionState" apps/connectshyft-api
```

Must show usage across lifecycle and webhook handlers.

---

## 9. Outcome

After this checkpoint:

- BridgeSession becomes deterministic
- Webhook replay becomes safe
- Call state cannot drift
- Foundation is stable for voicemail and transcription completion
