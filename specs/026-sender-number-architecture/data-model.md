# Data Model: Sender Number Architecture

## Entity: SenderResolutionRequest

**Purpose**: The single input contract for centralized sender selection.

**Fields**

- `tenantId`: non-empty tenant identifier
- `orgUnitId`: non-empty org-unit identifier
- `threadId`: non-empty thread identifier
- `channel`: supported channel enum, initially `sms` and future-compatible with `voice`

**Validation rules**

- All fields are required.
- `channel` must be one of the supported sender-selection channels.
- The request must stay inside one tenant and one org unit.

**Relationships**

- References exactly one `ThreadSenderAlignment`.
- Produces exactly one `SenderResolutionResult`.

## Entity: ThreadSenderAlignment

**Purpose**: The thread-scoped durable sender anchor that lets repeated sender-resolution requests return the same number.

**Backed by current persistence**

- `connectshyft.cs_threads.last_inbound_cs_number_id`
- `connectshyft.cs_threads.preferred_outbound_cs_number_id`

**Logical fields**

- `threadId`
- `tenantId`
- `orgUnitId`
- `lastInboundProviderNumberE164`
- `preferredOutboundProviderNumberE164`
- `alignmentChannelSet`
- `updatedAtUtc`

**Validation rules**

- Stored sender-alignment values must be normalized provider-number values or empty during migration cleanup.
- Legacy synthetic tokens are invalid sender anchors and must not resolve successfully.
- When both inbound and outbound aligned numbers are present for the same SMS thread, they must agree or the resolver must refuse.
- A thread cannot borrow a sender number from another tenant or org unit.

**Relationships**

- Belongs to one ConnectShyft thread.
- Validates against one `RoutingMappingMatch` at resolution time.

**State transitions**

- `unaligned` -> `aligned`: inbound or explicit thread update persists a provider number onto the thread.
- `aligned` -> `validated`: `resolveSenderNumber(...)` confirms the stored number still resolves to one valid tenant-scoped mapping.
- `aligned` -> `invalid`: mapping becomes missing, inactive, ambiguous, cross-scoped, or legacy synthetic data is encountered.
- `invalid` -> `aligned`: a subsequent trusted thread update replaces the invalid value with a valid provider number.

## Entity: RoutingMappingMatch

**Purpose**: The authoritative number-mapping record returned by number resolution.

**Fields**

- `mappingId`
- `tenantId`
- `orgUnitId`
- `providerNumberE164`
- `label`
- `isActive`

**Validation rules**

- `providerNumberE164` must be a normalized provider number.
- `tenantId` from the mapping must match the request tenant.
- `orgUnitId` from the mapping must match the request org unit for a successful resolution.
- Ambiguous or missing mapping results are not dispatchable.

**Relationships**

- Can validate many thread alignments over time, but one resolution attempt returns at most one active dispatchable mapping.

## Entity: SenderResolutionResult

**Purpose**: The deterministic outcome of sender selection.

**Fields**

- `ok`
- `channel`
- `providerNumberE164` when resolved
- `mappingId` when available
- `routingMetadata`
- `refusalCode` when unresolved
- `refusalReason` when unresolved
- `deterministic`

**Validation rules**

- Exactly one of “resolved sender” or “deterministic refusal” must be returned.
- Success results must include `providerNumberE164`.
- Refusal results must not include substitute sender numbers.

**Relationships**

- Produced from one `SenderResolutionRequest`.
- May reference one `RoutingMappingMatch`.

## Entity: InboundSenderScopeResolution

**Purpose**: The inbound-webhook scope result derived from provider metadata before a real thread is selected or ensured.

**Fields**

- `tenantId`
- `orgUnitId`
- `providerNumberE164`
- `correlationSource`
- `threadId` when a real provider correlation already exists, otherwise absent until the ensured-thread path completes

**Validation rules**

- Number-mapping fallback may resolve tenant or org-unit scope from the provider number.
- Number-mapping fallback must not invent a synthetic thread ID.
- If scope cannot be resolved deterministically, inbound processing must refuse.

**Relationships**

- Feeds neighbor resolution and thread ensure logic.
- Produces or updates `ThreadSenderAlignment` once a real thread is selected.

## Channel notes

- `sms`: fully in scope for same-thread sender reuse and inbound/outbound alignment.
- `voice`: partial in scope; any outbound line selection must use the same resolver and refusal rules, but provisioning and broader voice redesign remain out of scope.
