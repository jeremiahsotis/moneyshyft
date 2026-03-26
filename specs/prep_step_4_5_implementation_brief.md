# PREP STEP 4.5 — IMPLEMENTATION BRIEF
**Title:** Communications Reliability and Humanization Stabilization

## 1. OBJECTIVE
Restore MVP-safe communications reliability and remove misleading readiness behavior by fixing:
1. inbound-first SMS creation and identity attachment
2. outbound SMS target resolution against strict PeopleCore truth
3. thread claim persistence
4. operator callback and readiness resolution for outbound voice
5. misleading engineering and readiness language that overstates actual capability

## 2. ARCHITECTURAL DECISIONS (LOCKED)
1. Path A — strict PeopleCore is locked.
   - No legacy-neighbor-phone fallback for outbound SMS target resolution.
   - A thread is SMS-sendable only if its `person_id` resolves to a current People contact point suitable for SMS.
2. Inbound-first SMS must create or reuse PeopleCore identity truth.
   - If no current People identity matches the inbound sender number, create provisional person + contact point + current link.
   - If ambiguous, create resolver review and ambiguity event.
3. Claim persistence must accept platform actor IDs without UUID-only assumptions.
4. Telephony readiness remains backend-authoritative.
5. User-facing copy must not promise capability the backend cannot execute.

## 3. EXECUTION FLOW
### Flow A — Claim thread
1. Resolve lifecycle access context
2. Resolve current thread state
3. Accept actor user id as stable text identifier
4. Persist `claimed_by_user_id`, `claimed_at_utc`, `updated_by_user_id`
5. Emit current side effects
6. Return success contract

### Flow B — Outbound SMS from thread
1. Resolve thread outbound access context
2. Resolve sender number via existing sender-alignment path
3. Resolve target contact point via PeopleCore current links for `thread.person_id`
4. Require one deterministic SMS-capable People contact point
5. Create delivery attempt / send SMS
6. Persist timeline / outbox behavior
7. Return success contract or clean refusal

### Flow C — Inbound-first SMS
1. Receive webhook
2. Resolve tenant/orgUnit/provider from identifiers or destination number mapping
3. Normalize inbound sender number
4. Evaluate PeopleCore identity candidates
5. Branch:
   - one deterministic current person → use person
   - zero matches → create provisional person/contact point/current link
   - ambiguous → create resolver review and ambiguity event
6. Ensure thread using resolved/created `personId`
7. Persist canonical inbound event + webhook receipt
8. Append inbound SMS to thread timeline

### Flow D — Outbound call from thread
1. Resolve thread outbound access context
2. Inspect telephony readiness
3. Resolve operator destination from callback number / allowed source
4. Start bridge call if ready
5. Otherwise refuse cleanly with actionable readiness metadata

## 4. STATE MACHINE
### Thread claim state
- `UNCLAIMED -> CLAIMED`
- `CLAIMED -> UNCLAIMED`
- `UNCLAIMED -> CLOSED`
- `CLAIMED -> CLOSED`

Guard:
- actor required for non-UNCLAIMED transitions
- actor identity may be text; must not be UUID-only

### Inbound SMS identity state
- `unresolved inbound sender`
  - -> `resolved current person`
  - -> `provisional person created`
  - -> `resolver_required`

### Outbound SMS readiness
- `thread available`
  - + valid sender alignment
  - + valid PeopleCore SMS target
  - -> `dispatchable`
- else -> refusal

### Outbound call readiness
- `thread available`
  - + provider ready
  - + operator destination resolved
  - + orgUnit mapping ready
  - -> `bridge runnable`
- else -> refusal

## 5. DATABASE CONTRACTS
### connectshyft.cs_threads
Relevant fields:
- `id`
- `tenant_id`
- `org_unit_id`
- `person_id`
- `claimed_by_user_id`
- `claimed_at_utc`
- `updated_by_user_id`
- `updated_at_utc`
- `last_inbound_cs_number_id`
- `preferred_outbound_cs_number_id`

### connectshyft.cs_operator_callback_numbers
Relevant fields:
- `tenant_id`
- `user_id`
- `phone_e164`

### connectshyft.cs_webhook_receipts
Relevant fields:
- `thread_id`
- `provider_event_id`
- `processing_status`
- `failure_reason`
- `correlation_keys`

### connectshyft.cs_identity_ambiguity_events
Relevant fields:
- `normalized_contact_point`
- `status`
- `resolver_review_id`
- `resolver_outcome`

### people.persons
Relevant fields:
- `id`
- `tenant_id`
- `org_unit_id`
- `status`

### people.contact_points
Relevant fields:
- `id`
- `tenant_id`
- `type`
- `normalized_value`
- `status`

### people.contact_point_links
Relevant fields:
- `contact_point_id`
- `subject_type`
- `subject_id`
- `is_current`
- `is_primary`

### people.resolver_reviews
Relevant fields:
- resolver review records created for ambiguous inbound-first identity

## 6. SERVICE LAYER (STRICT)
### File: `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
`async transitionThreadState(input: ThreadStoreTransitionInput): Promise<ThreadPersistenceTransitionResult>`

### File: `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`
`async resolveInboundWebhookCorrelation(input: ResolveInboundWebhookCorrelationInput): Promise<ResolveInboundWebhookCorrelationResult>`

### File: `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
`async createProvisionalPersonHook(input: ConnectShyftProvisionalIdentityHookInput): Promise<ConnectShyftProvisionalIdentityHookResult>`
`async createResolverReviewHook(input: ConnectShyftResolverReviewHookInput): Promise<ConnectShyftResolverReviewHookResult>`

### New file
`apps/connectshyft-api/src/modules/connectshyft/threadSmsTargetResolver.ts`

## 7. PROVIDER / INTEGRATION CONTRACTS
### Telnyx inbound SMS webhook
Required behavior:
- inbound-first messages must proceed on destination-number mapping without prior thread metadata

### Outbound call runtime
Required:
- operator callback destination
- valid provider mapping
- readiness path must reflect real runtime capability

## 8. EVENT HANDLING
- inbound SMS webhook → correlation → identity resolution → ensure thread → persist canonical event → append timeline
- thread claim route → transition thread state
- outbound SMS route → resolve sender + strict PeopleCore target
- outbound call route → inspect readiness + resolve operator destination

## 9. IDEMPOTENCY RULES
1. Webhook receipt and provider event remain dedupe source.
2. Provisional creation hook must tolerate duplicate retries via unique-violation reload path.
3. Resolver review creation remains duplicate-safe via trigger-source guard.
4. Claim transition remains lifecycle-policy guarded.

## 10. FAILURE MODES
### Claim
- `THREAD_NOT_FOUND`
- `TRANSITION_ACTOR_REQUIRED`
- `THREAD_PERSISTENCE_UNAVAILABLE`

### Outbound SMS
- `CONNECTSHYFT_SENDER_*`
- `CONNECTSHYFT_SMS_TARGET_REQUIRED`
- `CONNECTSHYFT_SMS_TARGET_AMBIGUOUS`
- `CONNECTSHYFT_SMS_TARGET_INVALID`

### Inbound SMS
- webhook correlation refusals
- thread ensure persistence unavailable
- identity ambiguity requiring review

### Outbound call
- `CONNECTSHYFT_TELEPHONY_NOT_READY`
- `CONNECTSHYFT_OPERATOR_DESTINATION_MISSING`

## 11. TEST CONTRACT
Required scenarios:
1. claim succeeds with non-UUID actor id
2. outbound SMS succeeds only when PeopleCore current contact point exists
3. outbound SMS refuses when no PeopleCore current contact point exists
4. inbound SMS with no existing match creates provisional person/contact point/link and thread
5. inbound SMS with multiple current links creates resolver review
6. outbound call uses callback number when present
7. readiness copy does not claim SMS/voice ready when runtime prerequisites fail

## 12. CHECKPOINTS
1. Claim persistence + actor-id normalization
2. Strict PeopleCore outbound SMS target resolution
3. Inbound-first SMS ensure/create + resolver review creation
4. Operator callback resolution + misleading readiness copy cleanup

## 13. DEFINITION OF DONE
Prep Step 4.5 is done only when:
- claim works end-to-end
- outbound SMS requires and successfully uses PeopleCore contact points
- inbound-first SMS creates provisional/review work correctly
- outbound call readiness reflects actual callback availability
- misleading engineering/readiness copy is removed

## 14. NON-GOALS
- No legacy neighbor-phone fallback for outbound SMS
- No CaseShyft
- No new modules
- No sender-alignment architecture redesign
