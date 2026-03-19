# PR 026 — Sender Number Architecture

## Objective

Establish a deterministic, centralized model for selecting sender numbers for SMS and voice, eliminating synthetic identifiers and fallback logic.

---

## Core Requirements

### Files to Include

Create branch 026-sender-number-architecture and use folder specs/026-sender-number-architecture

- specs/026-sender-number-architecture05-testing.md
- specs/026-sender-number-architecture06-pr-template.md

### Central Authority

All sender number selection MUST go through:

resolveSenderNumber({
tenantId,
orgUnitId,
threadId,
channel
})

---

### Supported Channels

- sms
- voice (future)

---

### Inputs

- tenantId
- orgUnitId
- threadId
- channel

---

### Outputs

- providerNumberE164
- mappingId (optional)
- routing metadata

---

### Behavior

- MUST NOT generate synthetic identifiers
- MUST NOT fallback to neighborId or threadId
- MUST use number mapping service

---

### Consistency

- same thread MUST use same sender number
- inbound and outbound must align

---

### Number Mapping Integration

Use existing:

connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber

---

### Failure Behavior

If no mapping found:

- deterministic refusal
- no fallback

---

## Constraints

- no random number assignment
- no per-message number switching
- must be tenant-scoped

---

## Out of Scope

- number provisioning
- number pooling strategies
- regulatory compliance (A2P)
