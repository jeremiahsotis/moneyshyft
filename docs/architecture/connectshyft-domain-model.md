# ConnectShyft Domain Model

## Status

Authoritative

---

## 1. Core Objects

- Conversation
- Message
- MessageAttachment
- DeliveryAttempt
- Call
- Voicemail
- CallRecording
- SenderNumber
- TimelineEvent
- ProviderEvent

---

## 2. Conversation Model

Conversation is the operational container.

Anchored to:

- ContactPoint
- orgUnit

---

## 3. Identity-Aware States

- unresolved
- ambiguous
- resolved
- resolver_required

These states drive UI and behavior.

---

## 4. Responsibilities

- messaging
- voice
- routing
- delivery tracking
- compliance enforcement
- timeline rendering

---

## 5. Non-Responsibilities

- identity resolution
- merge decisions
- case management
- program workflow

---

## 6. Timeline

Timeline is:

- projection only
- built from underlying objects

Supports:

- mixed channels
- chronological ordering
- pagination
- grouping

---

## 7. Sender Numbers

- one per orgUnit (v1)
- no pooling
- routing must be deterministic

---

## 8. Compliance

Blocked sends must:

- fail explicitly
- show reason
- guide next step
- be auditable

---

## 9. WorkIntent

- lightweight
- transitional
- not persistent workflow

---

## 10. Rebinding Rules

- conversation subject may rebind
- message history does NOT
- delivery records do NOT
