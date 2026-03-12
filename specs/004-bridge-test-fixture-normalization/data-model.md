# Data Model: CS-004b Bridge Test Fixture Normalization

## Overview

CS-004b does not add or change runtime persistence. The relevant entities are test-side fixture models that must mirror the existing provider-neutral bridge contract without implying vendor coupling above infrastructure.

## Entities

### 1. Normalized Bridge Route Fixture

**Purpose**: Represents the request/response and adapter-mock data used by bridge route tests.

**Fields**
- `providerKey`
- `threadId`
- `tenantId`
- `orgUnitId`
- `eventType`
- `providerLegId`
- `providerMessageId`
- `providerEventId`
- `providerNumber`
- `bridgeSessionId`
- `sessionState`
- `operatorLegState`
- `neighborLegState`
- `failureCode`
- `failureMessage`

**Validation Rules**
- Must use normalized camelCase provider correlation fields in bridge and app-layer tests.
- Vendor-prefixed field names are not allowed in these fixtures.
- Identifier values should be provider-neutral unless the provider itself is the behavior under test.

**Relationships**
- Consumed by `connectshyft.bridge-flow.test.ts`
- Consumed by `connectshyft.outbound-dispatch.test.ts`

### 2. Normalized Bridge Session Fixture

**Purpose**: Represents the provider adapter return values and persisted-state expectations used by bridge session application tests.

**Fields**
- `providerKey`
- `channel`
- `bridgeSessionId`
- `providerLegId`
- `providerRequestId`
- `requestedAt`
- `status`
- `operatorLegStatus`
- `neighborLegStatus`
- `failureCode`
- `failureMessage`

**Validation Rules**
- Must retain existing state expectations from CS-004.
- Must use neutral provider leg/message identifier values.
- Must not imply raw provider payload semantics.

**Relationships**
- Consumed by `bridgeSessions.test.ts`
- Mirrors the existing runtime bridge aggregate without changing it

### 3. Provider Correlation Fixture

**Purpose**: Represents the bridge-adjacent provider identifier mapping records used in provider-correlation tests.

**Fields**
- `providerName`
- `identifierKind`
- `providerIdentifier`
- `internalReferenceId`
- `tenantId`
- `orgUnitId`
- `threadId`

**Validation Rules**
- Provider names may be neutral labels such as `provider-a` and `provider-b`.
- Identifier values should be neutralized to `provider-leg-*` or `provider-message-*` when the test is not about a specific vendor.
- Existing uniqueness, ambiguity, and replay-safety semantics must remain unchanged.

**Relationships**
- Consumed by `providerCorrelationMappings.test.ts`
- Supports bridge leg correlation without changing runtime mapping behavior

### 4. Provider Translation Exception Fixture

**Purpose**: Documents the allowed exception for provider-native payloads in infrastructure-edge tests and helpers.

**Fields**
- `providerNativeHeaders`
- `providerNativePayload`
- `signatureMaterial`
- `translationExpectation`

**Validation Rules**
- May remain provider-native only when translation or signature verification is the explicit behavior under test.
- Must not be imported into bridge-domain or app-layer bridge tests.

**Relationships**
- Applies to infrastructure translation/signature tests and helpers only
- Explicitly excluded from the CS-004b bridge-fixture cleanup set

## State Considerations

Runtime bridge state transitions do not change in CS-004b. Test fixtures must continue to represent the existing bridge lifecycle accurately:

- `created`
- `operator_dialing`
- `operator_answered`
- `neighbor_dialing`
- `neighbor_answered`
- `bridged`
- `completed`
- `failed`

## Non-Changes

- No schema changes
- No migration changes
- No provider adapter contract changes
- No bridge runtime model changes
