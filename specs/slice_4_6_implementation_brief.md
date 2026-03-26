# Slice 4.6 Implementation Brief — ConnectShyft Communication Contract Repair

## 1. OBJECTIVE
Repair the four blocked ConnectShyft communication seams without drift:
1. canonical sender alignment for thread outbound/inbound number storage
2. operator callback resolution from the canonical callback table
3. thread claim persistence through the application write path
4. inbound-first SMS correlation continuation on mapped inbound provider number

## 2. ARCHITECTURAL DECISIONS (LOCKED)
1. Canonical thread sender alignment must use provider-number E.164, not symbolic `cs-number-*` sentinels.
2. Existing thread columns `last_inbound_cs_number_id` and `preferred_outbound_cs_number_id` are compatibility columns only.
3. New canonical storage fields must be:
   - `last_inbound_provider_number_e164`
   - `preferred_outbound_provider_number_e164`
4. Thread outbound sender resolution must read canonical provider-number fields first.
5. Operator destination resolution must read `connectshyft.cs_operator_callback_numbers` by `(tenant_id, user_id)` and return `callback_number_e164`.
6. Thread claim persistence must succeed through the application write path; database structure is already valid.
7. Inbound-first SMS must be allowed to continue on mapped inbound provider number alone; person resolution belongs downstream in identity/provisional/review flow.
8. No fallback to legacy neighbor-phone targeting for outbound SMS.
9. No symbolic default runtime values like `cs-number-default-outbound` may remain authoritative after this slice.

## 3. EXECUTION FLOW
### Flow A — Thread canonical sender alignment
1. Load thread record.
2. Read canonical provider-number fields if present.
3. If canonical fields are empty, backfill from legacy fields:
   - direct copy when legacy value is valid E.164
   - deterministic orgUnit mapping lookup only when legacy value is a symbolic sentinel and exactly one active mapping exists
   - otherwise leave canonical field null
4. Persist canonical values during migration.
5. All new writes must populate canonical provider-number fields.
6. Read contracts must expose canonical values and preserve compatibility output until callers are fully migrated.

### Flow B — Outbound SMS
1. Load thread outbound context.
2. Resolve sender number from canonical thread provider-number fields.
3. Resolve active orgUnit mapping by canonical provider number.
4. Refuse if sender mapping missing or ambiguous.
5. Continue to PeopleCore target resolution only after sender alignment succeeds.

### Flow C — Outbound voice
1. Load thread outbound context.
2. Resolve operator callback by `(tenant_id, actorUserId)` from `cs_operator_callback_numbers`.
3. If none, fallback to claimed user when applicable.
4. If still none, fallback to orgUnit default only if configured.
5. Refuse with `CONNECTSHYFT_OPERATOR_DESTINATION_MISSING` only when all canonical callback paths fail.

### Flow D — Claim thread
1. Load lifecycle access context.
2. Load current thread.
3. Validate transition.
4. Persist claim fields through `transitionThreadState()`.
5. Return success envelope with updated thread state.

### Flow E — Inbound-first SMS
1. Parse provider webhook.
2. Attempt metadata correlation.
3. Attempt provider identifier correlation.
4. If both fail and inbound provider number is mapped to tenant/orgUnit, return successful correlation with:
   - `source = 'number_mapping'`
   - resolved tenantId/orgUnitId
   - empty threadId
   - preserved provider identifiers and provider number
5. Downstream executor performs PeopleCore identity/provisional/review resolution and thread ensure.

## 4. STATE MACHINE
### Sender alignment
- `legacy_sentinel_only` -> `canonical_backfilled`
- `canonical_backfilled` -> `canonical_authoritative`
- `canonical_authoritative` -> `canonical_authoritative`

### Outbound SMS
- `thread_loaded`
- `sender_alignment_resolved`
- `sender_mapping_resolved`
- `target_resolved`
- `dispatch_attempted`

Refusal transitions:
- `thread_loaded` -> `sender_alignment_refused`
- `sender_alignment_resolved` -> `sender_mapping_refused`
- `sender_mapping_resolved` -> `target_refused`

### Outbound voice
- `thread_loaded`
- `operator_destination_resolved`
- `bridge_dispatch_attempted`

Refusal transition:
- `thread_loaded` -> `operator_destination_refused`

### Claim
- `UNCLAIMED -> CLAIMED`
- `CLAIMED -> UNCLAIMED`
- `UNCLAIMED -> CLOSED`
- `CLAIMED -> CLOSED`

### Inbound-first SMS correlation
- `metadata_resolved`
- `provider_identifier_resolved`
- `number_mapping_resolved`
- `correlation_refused`

## 5. DATABASE CONTRACTS
### Table: `connectshyft.cs_threads`
Existing fields:
- `id TEXT/UUID primary key`
- `tenant_id TEXT/UUID not null`
- `org_unit_id TEXT/UUID not null`
- `last_inbound_cs_number_id TEXT not null default ''`
- `preferred_outbound_cs_number_id TEXT not null default ''`
- `claimed_by_user_id TEXT/UUID nullable`
- `claimed_at_utc TIMESTAMPTZ nullable`
- `updated_by_user_id TEXT/UUID nullable`
- `updated_at_utc TIMESTAMPTZ not null`

New fields to add:
- `last_inbound_provider_number_e164 TEXT nullable`
- `preferred_outbound_provider_number_e164 TEXT nullable`

Constraint:
- both canonical fields must either be null or match `^\+[1-9][0-9]{1,14}$`

### Table: `connectshyft.cs_number_mappings`
Fields used:
- `id`
- `tenant_id`
- `org_unit_id`
- `twilio_number_e164`
- `label`
- `is_active`

### Table: `connectshyft.cs_operator_callback_numbers`
Fields used:
- `tenant_id`
- `user_id`
- `callback_number_e164`
- `callback_number_raw_input`
- `created_at_utc`
- `updated_at_utc`

## 6. SERVICE LAYER (STRICT)
### File
`apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`

```ts
export type ResolveSenderNumberInput = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  channel: ConnectShyftSenderChannel;
};

export async function resolveSenderNumber(
  input: ResolveSenderNumberInput,
  overrides?: ResolveSenderNumberDependencies,
): Promise<ResolveSenderNumberResult>
```

Responsibility:
- resolve canonical thread sender alignment and orgUnit mapping

### File
`apps/connectshyft-api/src/modules/connectshyft/threads.ts`

```ts
async transitionThreadState(
  input: ThreadStoreTransitionInput,
): Promise<ThreadPersistenceTransitionResult>
```

```ts
async upsertThread(
  input: UpsertConnectShyftThreadInput,
): Promise<ConnectShyftThread>
```

Responsibility:
- persist thread canonical sender fields and lifecycle transitions

### File
`apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`

```ts
type OperatorDestinationStore = {
  getUserPhone(input: {
    tenantId: string;
    userId: string;
  }): Promise<{ userId: string; phoneNumber: string | null } | null>;
};
```

```ts
export async function resolveOperatorDestination(
  input: ResolveOperatorDestinationInput,
  overrides?: ResolveOperatorDestinationDependencies,
): Promise<ResolveOperatorDestinationResult>
```

Responsibility:
- read callback number from canonical callback store/table

### File
`apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`

```ts
export const resolveInboundWebhookCorrelation = async (
  input: ResolveInboundWebhookCorrelationInput,
): Promise<ResolveInboundWebhookCorrelationResult>
```

Responsibility:
- allow mapped inbound provider number to continue correlation for inbound-first SMS

## 7. PROVIDER / INTEGRATION CONTRACTS
1. Outbound sender mapping uses the active number in `cs_number_mappings.twilio_number_e164`.
2. Inbound webhook provider number correlation uses `input.providerCorrelation.providerNumber`.
3. Inbound-first SMS must not require prior thread metadata if mapped inbound number resolves tenant/orgUnit.
4. Provider identifiers remain optional for first-contact inbound SMS when number mapping is sufficient.

## 8. EVENT HANDLING
- `POST /threads/:threadId/messages` -> sender alignment -> sender mapping -> PeopleCore target -> dispatch
- `POST /threads/:threadId/call` -> operator destination resolution -> bridge dispatch
- `POST /threads/:threadId/claim` -> `transitionThreadState()`
- `POST /webhooks/sms` -> `resolveInboundWebhookCorrelation()` -> inbound core executor

## 9. IDEMPOTENCY RULES
1. Backfill migration must only populate canonical fields when null/empty.
2. Thread write paths must not overwrite canonical fields with symbolic sentinels.
3. Operator callback resolution is read-only and deterministic by `(tenant_id, user_id)`.
4. Inbound webhook correlation must preserve existing metadata/provider-id precedence before number-mapping fallback.
5. Inbound-first SMS number-mapping fallback must not create domain writes inside correlation resolution.

## 10. FAILURE MODES
1. `CONNECTSHYFT_SMS_SENDER_REQUIRED`
   - only when canonical sender alignment or active mapping cannot be resolved
2. `CONNECTSHYFT_OPERATOR_DESTINATION_MISSING`
   - only when callback-table lookup and allowed fallback paths all fail
3. `CONNECTSHYFT_THREAD_PERSISTENCE_UNAVAILABLE`
   - only for actual application write failure after transition validation
4. `CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED`
   - must no longer fire for mapped first-contact inbound SMS with provider number present

## 11. TEST CONTRACT
Required files:
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/senderNumberResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/operatorDestinationResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/operatorCallbackNumbers.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.inboundWebhookContext.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-claim.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`

Required scenarios:
1. legacy symbolic thread sender values backfill to canonical E.164 when deterministic mapping exists
2. outbound SMS uses canonical provider number
3. callback resolver returns callback from `cs_operator_callback_numbers`
4. claim route persists claim fields successfully
5. inbound-first SMS with mapped provider number continues correlation without prior metadata

## 12. CHECKPOINTS (MANDATORY — USE CHECKPOINT SPEC)
1. Slice 4.6A — canonical sender-alignment migration and resolver cutover
2. Slice 4.6B — operator callback resolver cutover
3. Slice 4.6C — claim persistence repair
4. Slice 4.6D — inbound-first SMS correlation rewrite

## 13. DEFINITION OF DONE
1. No new thread writes store symbolic `cs-number-*` sender alignment.
2. Existing relevant threads have canonical provider-number fields populated where deterministically resolvable.
3. Outbound SMS for thread `f3fe1191-f90a-4c7d-82ef-f77ce5dff8ba` no longer fails on `invalid_sender_alignment`.
4. Outbound voice for the same thread no longer fails on missing operator destination when callback row exists.
5. Claim route succeeds for the same thread.
6. Telnyx inbound-first SMS on mapped inbound number no longer returns `CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED`.

## 14. NON-GOALS
1. No redesign of number mapping table naming (`twilio_number_e164`) in this slice.
2. No PeopleCore target-resolution redesign beyond preserving current downstream gating.
3. No inbound voice correlation redesign beyond keeping existing precedence.
4. No UI redesign beyond reflecting corrected backend behavior.

## 15. FUTURE EXTENSION POINTS
1. Rename mapping column from `twilio_number_e164` to provider-neutral naming in later schema hardening.
2. Remove compatibility thread columns after all reads/writes move to canonical provider-number fields.
3. Extend inbound-first correlation flow to additional provider event families beyond SMS.
