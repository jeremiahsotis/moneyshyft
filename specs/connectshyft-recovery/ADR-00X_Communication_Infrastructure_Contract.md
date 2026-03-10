# ADR-00X: Communication Infrastructure Contract for People-Core-Safe Telephony

Status: Proposed  
Date: 2026-03-10  
Owners: Shyft Ecosystem / ConnectShyft  
Decision Type: Cross-cutting architecture decision

## 1. Context

ConnectShyft needs outbound SMS and voice, true bridge calling, retry-safe idempotency, and human-friendly phone handling. At the same time, the implementation must not trap phone identity, telephony behavior, or communication audit patterns inside ConnectShyft-specific code, because upcoming People Core Domain, ProgramShyft, and CaseShyft work will need the same infrastructure.

The product direction already establishes several non-negotiables:

- ConnectShyft is volunteer-first and calm. The conversation is the hero, desktop adds a right rail for contact context, and settings stay volunteer-only instead of exposing backend ops surfaces. fileciteturn5file0
- The canonical desktop thread layout keeps the main conversation front and center while moving contact context into a right rail instead of leaking routing internals into the timeline. fileciteturn5file12
- The ecosystem already treats phone as valid collected data while explicitly avoiding unnecessary dignity-eroding or liability-heavy personal details. The current product brief says to collect name, address, phone, optional email, and preferences, and to never collect income, family situation, or reasons for distress. fileciteturn5file12

The failure mode to avoid is obvious:
1. phone parsing logic gets embedded in ConnectShyft forms
2. Telnyx gets coupled directly to UI actions
3. bridge flow becomes provider-specific spaghetti
4. audit and idempotency differ by module
5. People Core Domain later has to reverse-engineer communication identity out of ConnectShyft

This ADR defines the middle path: enough contract to prevent drift, not so much prescription that implementation becomes handcuffed.

## 2. Decision

We will establish a shared Communication Infrastructure Contract with four core decisions:

1. **Phone identity is a shared domain capability, not a ConnectShyft-local utility**
2. **Telephony runs behind a provider-agnostic outbound adapter boundary**
3. **Calls use a persisted bridge-session state model, not transient UI-driven orchestration**
4. **All outbound communication operations use a common idempotency + audit contract**

## 3. Decision Details

### 3.1 Phone identity model

#### Decision
Phone handling will live in a shared communication/people-safe domain package, not in app-local components, view helpers, or ConnectShyft-only services.

#### Canonical shape
A phone value has at least these conceptual fields:

- `raw_input`: optional, what the user typed, retained only when justified for trace/debug
- `normalized_e164`: required canonical storage value
- `display_national`: formatted display value for UI
- `country_code`: derived
- `national_number`: derived
- `extension`: optional
- `validation_status`: valid | invalid | needs_review
- `source`: user_entered | imported | system_generated
- `is_primary`: boolean
- `usage_type`: mobile | landline | unknown
- `shared_phone_flag`: boolean
- `sms_capable`: nullable boolean
- `voice_capable`: nullable boolean

#### Rules
- UI must never require the user to understand E.164.
- A user may enter 10-digit domestic numbers naturally.
- A user may enter 7-digit local numbers only when a deployment-level default area code is configured.
- The system converts successful input to canonical E.164 before persistence.
- Storage uses canonical E.164 internally.
- Display uses human-friendly national formatting.
- No module may hardcode an area code in UI logic or a local component.
- Area code fallback must be configuration-driven and overridable at org/tenant level later.
- Multiple phone numbers per person/contact must be supported from the start.
- Shared phone and texting preference are communication traits, not one-off UI labels, because the target UI explicitly surfaces “Prefers texting” and “Shared phone” as first-class pills. fileciteturn5file0

#### Recommended location
`/domains/communication/phone/`

#### Required public interface
- `parsePhone(input, context)`
- `normalizePhone(input, context)`
- `formatDisplayPhone(phone, locale)`
- `validatePhoneForChannel(phone, channel)`
- `comparePhoneIdentity(a, b)`

#### Counterpoint
Do **not** overfit this to “Person” only. The communication layer should support person/contact records now, and later attach to household, organization, guardian, donor, or alternate contact models without rewriting the core phone logic.

---

### 3.2 Telephony provider boundary

#### Decision
Telnyx is the first provider, but no domain, application service, or UI component may depend directly on Telnyx request/response shapes.

#### Required boundary
Create a provider-neutral telephony adapter contract with capabilities, not vendor semantics.

#### Conceptual interface
- `sendSms(command)`
- `startOutboundCall(command)`
- `startBridgeSession(command)`
- `endCall(command)`
- `lookupMessageStatus(query)`
- `lookupCallStatus(query)`
- `verifyWebhook(signature, payload, headers)`
- `translateProviderEvent(payload)`

#### Telnyx implementation
Provide a Telnyx adapter that consumes `TELNYX_API_KEY` and any related webhook secret material, but exposes only normalized domain events and responses upstream.

#### Rules
- UI calls application services only.
- Application services call domain/infrastructure adapters.
- Provider payloads are translated once at the edge.
- Provider-specific identifiers may be stored for reconciliation, but upstream services should work with internal IDs first.
- Replacing Telnyx later must not require changing ConnectShyft thread UI or People Core phone identity code.

#### Recommended location
- contract: `/domains/communication/telephony/`
- provider adapter: `/infrastructure/communications/telnyx/`

#### Counterpoint
Do **not** build a fake generic abstraction with dozens of speculative methods. Keep the interface limited to capabilities you actually need in the next 2 to 3 modules.

---

### 3.3 Bridge call orchestration

#### Decision
Bridge calling will use a persisted bridge-session model managed by application/domain services, not UI-driven step chaining.

#### Bridge session concept
A bridge session represents one operator-to-neighbor contact attempt with at least:

- internal bridge session id
- thread/conversation id
- operator identity
- target contact identity
- selected outbound number
- operator leg status
- neighbor leg status
- bridge status
- provider correlation ids
- timestamps
- failure reason code
- current retry state
- ended_by
- audit correlation id

#### State model
Recommended minimum states:

- `created`
- `operator_dialing`
- `operator_answered`
- `neighbor_dialing`
- `neighbor_answered`
- `bridged`
- `completed`
- `failed`
- `canceled`
- `expired`

#### Rules
- State must be persisted between events.
- The UI is a controller, not the source of truth.
- Provider webhook events drive state transitions after validation.
- Repeated or out-of-order provider events must be safe to replay.
- The system must support operator leg + neighbor leg + bridge control explicitly.
- The thread timeline may display a calm communication event, but routing/control internals stay out of the main volunteer conversation surface, which is consistent with the canonical UI direction. fileciteturn5file0turn5file12

#### Counterpoint
Do **not** model the bridge solely as two unrelated calls plus frontend assumptions. That works until the first retry, timeout, or webhook race.

---

### 3.4 Idempotency and audit contract

#### Decision
Every outbound communication command uses the same idempotency and audit pattern across SMS, outbound voice, and bridge orchestration.

#### Idempotency rules
- All mutation endpoints that create or advance outbound communication must accept `Idempotency-Key`.
- The idempotency scope must include actor + operation type + route/action + request fingerprint.
- Duplicate retries with the same effective request must return the original result or current authoritative result.
- A reused key with materially different payload must fail loudly.
- Idempotency records must persist long enough to cover realistic client retry windows and provider callback lag.

#### Audit rules
Every communication mutation must create an auditable record with at least:

- internal audit id
- correlation id
- actor id / system actor
- tenant/org scope
- operation name
- target entity type/id
- communication channel
- request summary
- resulting state
- provider reference ids if present
- created timestamp
- completed timestamp
- failure code / failure message
- idempotency key
- replay flag if event was replayed

#### Webhook handling rules
- Webhooks must be signature-verified before processing.
- Webhooks must be stored or checkpointed before side effects when practical.
- Webhook processing must be replay-safe.
- Duplicate provider events must not duplicate thread messages, audit rows, or state transitions.
- Translation from provider event to internal event happens once at ingestion.

#### Retry rules
- Client retry safety is handled by idempotency.
- Background/provider retry handling uses bounded exponential backoff with jitter.
- Permanent failures become terminal states with visible audit evidence.
- Retry logic belongs in application/infrastructure services, not UI components.

#### Recommended locations
- idempotency contract: `/domains/communication/reliability/`
- audit persistence/service: `/domains/communication/audit/`
- webhook ingestion: `/infrastructure/communications/webhooks/`

#### Counterpoint
Do **not** wait until after SMS/calling is “working” to add idempotency. That guarantees cleanup debt.

## 4. Data Ownership and Boundaries

### Owns what

#### People Core / shared communication domain owns
- phone identity normalization and formatting
- channel suitability checks
- contact communication traits
- provider-neutral telephony contracts
- reliability/idempotency/audit primitives

#### ConnectShyft owns
- thread-level communication actions
- volunteer-facing rendering of messages/call events
- conversation-specific business actions such as Call, Text, Close
- use of communication services inside ConnectShyft workflows

#### Provider adapter layer owns
- Telnyx API integration
- webhook signature verification
- provider event translation
- provider-specific identifiers and mapping

### Explicit non-ownership
- ConnectShyft does **not** own canonical phone parsing rules.
- UI components do **not** own retry policy.
- Provider adapters do **not** own business workflow state.
- People Core does **not** own ConnectShyft-specific conversation rendering.

## 5. API and Persistence Guidance

This ADR intentionally does not freeze exact table names, but it does freeze the persistence shape.

### Must persist somewhere durable
- canonical phone identities
- per-contact communication traits
- provider reference mappings
- bridge sessions and leg states
- idempotency records
- communication audit records
- normalized webhook event receipts or equivalent replay-safe checkpoints

### API guidance
Application-facing APIs should speak in domain terms, for example:
- send message to contact
- start outbound call for thread
- start bridge session for thread
- close bridge session
- fetch communication timeline entries

They should not expose raw Telnyx payload semantics above the infrastructure edge.

## 6. UX Consequences

This ADR supports the target ConnectShyft UX instead of fighting it:

- The conversation remains the hero in thread view. fileciteturn5file0
- The right rail can safely display communication context like multiple phone numbers, texting preference, and shared phone traits because those become stable communication-domain data, not ad hoc UI strings. fileciteturn5file12turn5file0
- Settings stay volunteer-facing and calm rather than turning into a telephony control panel. fileciteturn5file0

## 7. Alternatives Considered

### Alternative A: Keep everything in ConnectShyft for speed
Rejected.

Why:
- fastest in the short term
- guarantees People Core cleanup later
- repeats logic in ProgramShyft and CaseShyft
- raises drift risk immediately

### Alternative B: Fully design People Core first, then build ConnectShyft
Rejected.

Why:
- architecturally pure
- too slow for the current remediation need
- blocks urgent outbound communication fixes

### Alternative C: Middle path with bounded shared contracts
Accepted.

Why:
- enough shared architecture to prevent drift
- enough implementation freedom to let developers solve real problems
- unblocks ConnectShyft now without poisoning future modules

## 8. Implementation Guardrails

These are non-negotiable:

1. No E.164 awareness in end-user UI
2. No phone normalization logic in view components
3. No direct Telnyx calls from UI
4. No bridge flow managed purely in frontend state
5. No outbound mutation endpoint without idempotency support
6. No provider webhook side effects without replay-safe processing
7. No ConnectShyft-only schema decision that blocks future People Core reuse
8. No volunteer-facing timeline cluttered with provider/debug metadata

## 9. Delivery Implications

### Immediate issues this ADR should shape
- CS-002 Phone Identity
- CS-003 Telnyx Outbound Adapter
- CS-004 Call Bridge Flow
- CS-005 Reliability / Idempotency / Audit

### PR evidence expected
For any issue touching this ADR, require:
- unit/integration tests
- explicit note of which guardrails were satisfied
- migration notes if persistence changed
- screenshots/video only for user-facing behavior
- a follow-up ADR only if the developer encounters a true fork not already resolved here

## 10. Definition of Done for this ADR

This ADR is considered adopted when:
- phone normalization is implemented in a shared communication/people-safe domain
- Telnyx exists only behind the adapter boundary
- bridge sessions persist state outside the UI
- outbound communication endpoints require idempotency
- communication audit records exist for SMS and call flows
- ConnectShyft thread UI consumes normalized communication data instead of inventing local phone metadata behavior

## 11. Open Questions Intentionally Left Open

These remain implementation choices unless they create a new architectural fork:
- exact table names
- exact migration file names
- exact package/file naming below the approved boundaries
- exact queue technology for async processing
- exact provider failover strategy
- exact retention window values for idempotency records

Those choices should be solved in implementation, not by bloating this ADR.
