# CS-004 Bridge Flow Sequence Diagram

This diagram is the reference flow for `CS-004_Call_Bridge_Guardrailed_Spec.md`.

It shows the intended orchestration boundary:

- UI triggers an action
- application service starts the bridge session
- bridge domain owns state transitions
- telephony provider interface is used
- Telnyx remains behind the adapter boundary

## Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    participant UI as ConnectShyft UI
    participant APP as Application Service
    participant BRIDGE as Bridge Domain
    participant TELE as Telephony Provider Interface
    participant TELNYX as Telnyx Adapter
    participant DB as Persistence

    UI->>APP: Start bridge call(threadId, operator, neighbor)
    APP->>BRIDGE: startBridgeSession(command)

    BRIDGE->>DB: create bridge_session(status=created)
    BRIDGE->>DB: create operator bridge_leg(status=created)
    BRIDGE->>DB: create neighbor bridge_leg(status=created)

    BRIDGE->>DB: transition session -> operator_dialing
    BRIDGE->>DB: transition operator leg -> dialing
    BRIDGE->>TELE: startOutboundCall(operator leg)

    TELE->>TELNYX: create operator call
    TELNYX-->>TELE: operator provider call id
    TELE-->>BRIDGE: operator call accepted

    BRIDGE->>DB: update operator leg(provider_call_id, status=ringing)

    Note over TELNYX,BRIDGE: Later provider events arrive
    TELNYX-->>TELE: operator answered event
    TELE-->>BRIDGE: provider event translated -> operator_answered

    BRIDGE->>DB: transition operator leg -> answered
    BRIDGE->>DB: transition session -> operator_answered
    BRIDGE->>DB: transition session -> neighbor_dialing
    BRIDGE->>DB: transition neighbor leg -> dialing
    BRIDGE->>TELE: startOutboundCall(neighbor leg)

    TELE->>TELNYX: create neighbor call
    TELNYX-->>TELE: neighbor provider call id
    TELE-->>BRIDGE: neighbor call accepted

    BRIDGE->>DB: update neighbor leg(provider_call_id, status=ringing)

    TELNYX-->>TELE: neighbor answered event
    TELE-->>BRIDGE: provider event translated -> neighbor_answered

    BRIDGE->>DB: transition neighbor leg -> answered
    BRIDGE->>DB: transition session -> neighbor_answered
    BRIDGE->>TELE: startBridgeSession(operator call id, neighbor call id)

    TELE->>TELNYX: bridge both call legs
    TELNYX-->>TELE: bridge success
    TELE-->>BRIDGE: bridged

    BRIDGE->>DB: transition session -> bridged

    alt call ends normally
        TELNYX-->>TELE: completed event(s)
        TELE-->>BRIDGE: completed
        BRIDGE->>DB: update leg statuses -> completed
        BRIDGE->>DB: transition session -> completed
    else leg fails or bridge fails
        TELNYX-->>TELE: failed event
        TELE-->>BRIDGE: failed(reason)
        BRIDGE->>DB: update leg/session -> failed
    end
```

## Non-Negotiable Notes

- The UI is not the source of truth.
- The bridge domain owns the session and leg state.
- The bridge domain must not import raw Telnyx payload types.
- Provider events must be translated before entering the bridge domain.
- Session state must persist outside frontend state.
