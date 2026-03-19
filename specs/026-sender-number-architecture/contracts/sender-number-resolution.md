# Contract: ConnectShyft Sender Number Resolution

## Objective

Provide one deterministic sender-selection contract for ConnectShyft so outbound SMS, inbound SMS alignment, and future-compatible voice sender selection all depend on the same tenant-scoped thread state and number-mapping validation.

## Allowed runtime surface

- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
  - centralized sender-selection policy
- `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`
  - authoritative `resolveRoutingMappingByNumber(...)` lookup
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
  - thread alignment persistence
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
  - read-model shaping and seeded alignment semantics
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
  - voice partial selected-outbound-line usage
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - outbound SMS flow, inbound SMS correlation or persistence flow, voice partial integration
- Related tests only:
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundVoice.test.ts`

## Service contract

### `resolveSenderNumber(input)`

**Input**

- `tenantId`
- `orgUnitId`
- `threadId`
- `channel`

**Success output**

- `ok = true`
- `providerNumberE164`
- `mappingId` (optional when mapping metadata exposes it)
- `routingMetadata`
  - `source`
  - `alignedFrom`
  - `deterministic = true`
  - `channel`

**Refusal output**

- `ok = false`
- `code`
- `message`
- `reason`
- `routingMetadata`
  - `deterministic = true`
  - refusal context only

## Resolution rules

1. Every sender-number decision for supported channels must call `resolveSenderNumber(...)`.
2. The resolver must load thread alignment from the requested tenant, org unit, and thread.
3. The resolver must treat only normalized provider-number values as valid sender anchors.
4. The resolver must validate candidate sender numbers with `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber(...)`.
5. A successful resolution requires exactly one valid mapping whose tenant and org unit match the request scope.
6. The same `{ tenantId, orgUnitId, threadId, channel }` must resolve to the same sender number while the alignment remains valid.
7. The resolver must not generate sender identity from `neighborId`, `threadId`, random selection, or synthetic tokens.

## Inbound alignment rules

1. Inbound SMS number-mapping fallback may resolve tenant or org-unit scope from the provider number.
2. Inbound number-mapping fallback must not fabricate a synthetic thread ID.
3. Once inbound processing selects or ensures the real thread, it must persist the real mapped provider number onto the thread alignment fields.
4. The persisted inbound-aligned sender number must be the same number future outbound sender resolution reuses for that thread, unless deterministic refusal is required.

## Outbound SMS rules

1. The outbound SMS route must call `resolveSenderNumber(...)` before dispatch.
2. Missing, invalid, ambiguous, or cross-scoped sender mappings must refuse before provider dispatch.
3. Existing target-phone resolution remains separate from sender resolution.
4. Request payload shape for `POST /api/v1/connectshyft/threads/:threadId/messages` remains unchanged.

## Voice partial rules

1. Any voice flow that selects an outbound ConnectShyft line must call `resolveSenderNumber(..., channel: 'voice')`.
2. Voice sender resolution must follow the same deterministic refusal rules as SMS.
3. Intake or voicemail fallback behavior must not create synthetic sender identifiers or substitute sender numbers.

## Refusal semantics

- `sender_alignment_missing`
- `sender_alignment_invalid`
- `sender_mapping_missing`
- `sender_mapping_ambiguous`
- `sender_scope_mismatch`
- `sender_channel_unsupported`

Every refusal must be deterministic, tenant-scoped, and non-dispatching.

## Compatibility and migration rules

- Existing public request payloads remain unchanged.
- Existing thread field names remain unchanged for this slice, even though their contents change from synthetic tokens to real provider-number alignment.
- `sms-inbound:*`, `sms-outbound:*`, and provider-number-derived synthetic thread IDs must be removed from runtime sender-selection logic.

## Must hold constant

- No number provisioning or pooling work
- No auth or admin routing changes
- No production migration authority changes
- No normal-path synthetic fallback rollback mechanism inside the forward design
