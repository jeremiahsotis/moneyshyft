# Research: ConnectShyft SMS Sender Architecture

No open clarification markers remained after loading the `021` spec and tracing the active ConnectShyft outbound SMS backend path. The decisions below resolve the planning inputs needed for implementation.

## Decision 1: Keep sender resolution in the ConnectShyft route, not a new shared abstraction

- **Decision**: Implement sender resolution as a route-local helper in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- **Rationale**: `performOutboundAction(...)` is the only place that already holds the active request scope, the constructed `ConnectShyftThread`, current target-resolution output, and the provider dispatch call site. Moving sender resolution elsewhere would widen ownership and invite a broader provider or communications refactor.
- **Alternatives considered**:
  - Add a new shared sender-resolution module in `domains/communication`: rejected because the spec explicitly limits scope and does not authorize a new cross-lane architecture.
  - Push sender selection into `providerRegistry.ts` or the Telnyx adapter: rejected because sender ownership must be settled before provider dispatch.

## Decision 2: Use existing orgUnit number mappings as the primary sender source and fail closed when not deterministic

- **Decision**: Resolve the outbound sender from `connectShyftNumberMappingServiceAsync.listMappings(tenantId, orgUnitId)` and treat the result as deterministic only when exactly one active mapping exists in the active orgUnit.
- **Rationale**: The current backend already owns orgUnit-scoped outbound numbers in `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`. That service is the narrowest existing source of truth for configured outbound numbers.
- **Alternatives considered**:
  - Use `TELNYX_FROM_NUMBER` as the normal path: rejected because it breaks orgUnit-specific ownership and violates the spec.
  - Pick the first active mapping when an orgUnit has several: rejected because it hides ambiguity and can silently send from the wrong line.

## Decision 3: Preserve thread outbound context as supporting metadata, not as a synthetic join

- **Decision**: Keep `preferredOutboundCsNumberId`, `lastInboundCsNumberId`, and any available `preferredOutboundLabel` in sender-resolution metadata and test fixtures, but do not invent a new join from those fields to number-mapping rows in this slice.
- **Rationale**: `apps/connectshyft-api/src/modules/connectshyft/threads.ts` and `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts` expose outbound-thread context, but current number mappings do not carry a stable corresponding identifier. A fabricated join would be architecture invention, not a narrow fix.
- **Alternatives considered**:
  - Match thread outbound context to number mappings by label: rejected because labels are operator-facing text and not a stable ownership key.
  - Add a new persistence join field now: rejected because the spec forbids schema work and broad redesign.

## Decision 4: Extend only the SMS command contract with `senderPhone`

- **Decision**: Add `senderPhone` to `TelephonySendSmsCommand` and leave call contracts unchanged.
- **Rationale**: The feature is SMS-only. Adding sender state to the base dispatch type or call contracts would widen scope into voice and bridge surfaces.
- **Alternatives considered**:
  - Add `fromNumber` or `fromPhone` to `TelephonyDispatchCommandBase`: rejected because it leaks provider wording or voice scope into unrelated command types.
  - Reuse `fromContactPointId` from bridge call surfaces: rejected because the SMS path needs an explicit E.164 sender phone, not a bridge contact-point identifier.

## Decision 5: Idempotency and request summaries must treat sender as material dispatch state

- **Decision**: Add `senderPhone` to `TelephonyDispatchReplayKeyInput`, include it in the replay fingerprint, and pass it through the route's outbound request summary.
- **Rationale**: Once sender becomes explicit provider-dispatch state, replay safety must consider sender changes materially different requests.
- **Alternatives considered**:
  - Leave replay keys unchanged and track sender only in the provider payload: rejected because the same idempotency key could then incorrectly replay a different sender choice.
  - Add a second sender-specific idempotency mechanism: rejected because the existing replay-key contract already owns materially different payload detection.

## Decision 6: Add sender-specific refusal semantics instead of reusing target or provider failures

- **Decision**: Introduce route-local sender refusals for missing or ambiguous sender ownership before provider dispatch.
- **Rationale**: Missing sender ownership is not the same failure as missing target resolution, and it must not surface as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.
- **Alternatives considered**:
  - Reuse `CONNECTSHYFT_SMS_TARGET_REQUIRED`: rejected because it reports the wrong operator problem.
  - Let the adapter surface an invalid request: rejected because it pushes a domain failure into provider-owned execution.

## Decision 7: Telnyx fallback remains adapter-owned compatibility behavior only

- **Decision**: Update `infrastructure/communications/telnyx/index.ts` so SMS payloads prefer `command.senderPhone`, then `TELNYX_FROM_NUMBER`, then the existing messaging-profile fallback.
- **Rationale**: This preserves operational fallback without letting the env var become the architectural source of sender ownership.
- **Alternatives considered**:
  - Remove `TELNYX_FROM_NUMBER` fallback entirely: rejected because the spec allows it to remain as compatibility behavior.
  - Prefer the env var over the explicit sender: rejected because it would override route-owned sender selection.

## Decision 8: Expand existing backend tests only

- **Decision**: Extend these existing suites:
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
  - `domains/communication/telephony/__tests__/index.test.ts`
  - `infrastructure/communications/telnyx/__tests__/index.test.ts`
- **Rationale**: These files already own the affected route, wrapper, shared-domain, and adapter behavior. No frontend or new harness work is required.
- **Alternatives considered**:
  - Add frontend coverage: rejected because the request shape is unchanged and the feature is backend-focused.
  - Rely on manual verification only: rejected because the spec requires durable regression coverage across orgUnits and fallback behavior.
