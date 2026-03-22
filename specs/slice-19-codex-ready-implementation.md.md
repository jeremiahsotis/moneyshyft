# Slice 19 — Codex-Ready Implementation Brief (Repo-Snapped, Hard Stop Checkpoints)

## Slice
Slice 19 — Telephony Configuration + Readiness Enforcement

## Status
Locked

## Authoritative execution source
This file is the authoritative execution source for Slice 19.

## Repo reality this brief is pinned to

### Existing backend seams already present in repo
- `apps/connectshyft-api/src/modules/connectshyft/telephonyReadiness.ts`
- `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/escalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/telephonySettingsContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/escalationConfigContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectTelephonyReadiness.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectOperatorCallbackNumber.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectOperatorCallbackNumber.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectAvailability.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectSettingsNavigation.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/operatorCallbackNumberContract.ts`

### Existing frontend seams already present in repo
- `apps/connectshyft-web/src/features/connectshyft/telephonySettings.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftSettingsView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/__tests__/ConnectShyftSettingsView.test.ts`
- `apps/connectshyft-web/src/features/connectshyft/escalation.ts`

### Existing route surface already present in deployed build
Preserve these existing route families and handler ownership:
- `GET /api/v1/connectshyft/settings/navigation`
- `GET /api/v1/connectshyft/availability`
- `GET /api/v1/connectshyft/telephony-readiness`
- `GET /api/v1/connectshyft/context`
- existing operator callback number read/write route mounted in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- existing escalation config read/write route mounted in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

Do not invent a new readiness route. Do not rename `/telephony-readiness`.

## Locked product / architecture decisions embedded in this slice

### Policy: Telephony settings stay inside the existing telephony-settings surface (LOCKED)
Decision:
- Do not create a new profile/settings subsystem for telephony.
- Extend the existing telephony settings surface already represented by:
  - `telephonyReadiness.ts`
  - `operatorCallbackNumbers.ts`
  - `telephonySettingsContext.ts`
  - `ConnectShyftSettingsView.vue`

Rules:
- Preserve current handler family ownership
- Preserve current route family shape
- Preserve current capability/context gating style
- No UI redesign outside the existing Settings view
- No new “ops” or “admin” surface for this slice

### Policy: Escalation config is the orgUnit fallback seam (LOCKED)
Decision:
- The orgUnit-level fallback phone lives on the existing escalation config seam.
- `apps/connectshyft-api/src/modules/connectshyft/escalationConfig.ts` is authoritative for orgUnit fallback persistence.

Rules:
- Do not create a second orgUnit telephony config table/service.
- Use `default_operator_phone_e164` on the escalation config seam.
- Reuse `getConnectEscalationConfig` / `putConnectEscalationConfig` and `escalationConfigContext.ts`.

### Policy: Readiness is a runtime gate, not an advisory badge (LOCKED)
Decision:
- Both SMS and Voice readiness must be computed now.
- Readiness must block dispatch when the requested channel is not ready.

Rules:
- Voice dispatch must refuse when voice readiness is false.
- SMS dispatch must refuse when SMS readiness is false.
- If readiness is true but degraded because orgUnit fallback is being used instead of operator callback number, dispatch remains allowed and UI must warn, not block.
- Refusal must happen before provider dispatch.

### Policy: Current telephony routing model must remain intact (LOCKED)
Decision:
- Do not redesign provider routing, sender mapping, bridge sessions, voicemail, or webhook orchestration in this slice.

Rules:
- Preserve thread-centric telephony runtime
- Preserve sender-number alignment rules
- Preserve bridge-session ownership
- Preserve existing webhook and provider behavior

## Existing contracts to preserve

### Existing telephony settings access context
Preserve and extend:
- `resolveConnectShyftTelephonyReadinessAccessContext`
- `resolveConnectShyftOperatorCallbackNumberReadAccessContext`
- `resolveConnectShyftOperatorCallbackNumberUpdateAccessContext`

From:
- `apps/connectshyft-api/src/modules/connectshyft/http/telephonySettingsContext.ts`

These already enforce:
- module capability
- orgUnit route context
- telephony settings access
- actor user context for telephony settings operations

Do not bypass this helper boundary.

### Existing escalation config access context
Preserve and extend:
- `ConnectShyftEscalationConfigPayload`
- `ConnectShyftEscalationConfigAccessContext`
- `ConnectShyftEscalationConfigUpdateAccessContext`

From:
- `apps/connectshyft-api/src/modules/connectshyft/http/escalationConfigContext.ts`

Do not build a second access path for orgUnit fallback phone changes.

### Existing frontend telephony contract
Preserve and extend:
- `ConnectShyftOperatorCallbackNumber`
- `ConnectShyftTelephonyReadiness`
- `DEFAULT_CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER`
- `DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS`
- `fetchConnectShyftOperatorCallbackNumber`
- `fetchConnectShyftTelephonyReadiness`
- `saveConnectShyftOperatorCallbackNumber`

From:
- `apps/connectshyft-web/src/features/connectshyft/telephonySettings.ts`

Do not replace this contract. Extend it.

## API contracts for this slice

### Contract 1 — `/api/v1/connectshyft/telephony-readiness`
Handler:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectTelephonyReadiness.ts`

Service:
- `connectShyftTelephonyReadinessServiceAsync.inspectReadiness(...)`

Locked changes:
- extend response shape to include SMS readiness alongside existing voice readiness
- preserve current envelope shape:
  - `ok`
  - `code`
  - `message`
  - `data`

Required data additions:
```ts
data: {
  providerReady: boolean;
  providerSelectionPathActive: boolean;
  webhookSignatureConfigured: boolean;
  orgUnitNumberMappingReady: boolean;
  voiceSupported: boolean;
  callbackNumberConfigured: boolean;
  callbackNumberNormalized: boolean;
  voiceReady: boolean;
  bridgeCallRunnable: boolean;

  smsReady: boolean;
  messageDispatchRunnable: boolean;

  callbackNumber: {
    value: string | null;
    rawInput: string | null;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    persistenceAvailable: boolean;
  };

  operatorPhoneSource: 'callback_number' | 'orgunit_default' | 'none';
  degradedMode: boolean;

  blockingReasons: Array<{
    code: string;
    category: 'provider' | 'callback_number' | 'orgunit_fallback' | 'number_mapping' | 'sms' | 'voice';
    message: string;
    blocking: boolean;
    channel?: 'sms' | 'voice' | 'both';
  }>;

  nextActions: Array<{
    code: string;
    message: string;
    path?: string;
  }>;
}
```

Rules:
- do not remove current readiness fields
- add SMS fields; do not rename existing voice fields
- `operatorPhoneSource` must be derived from the existing operator callback number seam first, then escalation config fallback
- `degradedMode` must be true when readiness is satisfied via orgUnit fallback instead of operator callback number

### Contract 2 — operator callback number read/write
Handlers:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectOperatorCallbackNumber.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectOperatorCallbackNumber.ts`

Contract helper:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/operatorCallbackNumberContract.ts`

Locked request payload:
```ts
{
  callbackNumber: string
}
```

Locked persistence target:
- existing operator callback number seam in `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`

Rules:
- preserve callback-number terminology on this route family
- do not rename this route to “profile phone”
- this is the operator’s callback / forwarding number
- normalize and validate through the existing contract/service seam
- frontend input remains ordinary user-entered phone format, not raw E.164

### Contract 3 — escalation config read/write
Handlers:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectEscalationConfig.ts`

Context helper:
- `apps/connectshyft-api/src/modules/connectshyft/http/escalationConfigContext.ts`

Service:
- `apps/connectshyft-api/src/modules/connectshyft/escalationConfig.ts`

Locked payload extension:
Extend existing `ConnectShyftEscalationConfigPayload` in `escalationConfigContext.ts` to include:
```ts
{
  orgUnitId: string | null;
  escalationBaselineHours: unknown;
  recipients: unknown;
  defaultOperatorPhoneE164?: unknown;
}
```

Rules:
- keep existing escalation config payload fields intact
- add `defaultOperatorPhoneE164`
- persist through `escalationConfig.ts`
- do not create a separate route for orgUnit fallback phone if it can be safely extended on the existing escalation config route

### Contract 4 — `/api/v1/connectshyft/context`
Handler:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectContext.ts`

Locked extension:
Add read-only telephony settings summary only. Do not turn `/context` into a settings API.

Required additions under `data.context` or adjacent handler-owned context payload:
```ts
{
  telephony: {
    operatorPhoneSource: 'callback_number' | 'orgunit_default' | 'none';
    voiceReady: boolean;
    smsReady: boolean;
    degradedMode: boolean;
  }
}
```

### Contract 5 — `/api/v1/connectshyft/availability`
Handler:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectAvailability.ts`

Locked extension:
Expose summary readiness state for settings/admin callers only.

Required additions:
```ts
{
  telephonyReadiness: {
    voiceReady: boolean;
    smsReady: boolean;
    degradedMode: boolean;
    blockingReasonCount: number;
  }
}
```

Do not overload availability with detailed callback-number payloads.

## Data / persistence contract

### Migration authority
Follow the repo’s shared migration authority model.

Create new shared migration(s) under:
- `shared/database/migrations/`

Create corresponding app-level wrappers/tests following existing migration conventions already used in this repo.

### Required persistence changes

#### 1. users callback-number persistence
Add callback number fields to the canonical `users` table via new shared migration:
- `phone_e164 TEXT NULL`
- optional `phone_verified_at TIMESTAMPTZ NULL` only if needed by existing service shape

Constraint:
- if you add `phone_e164`, enforce canonical E.164 format with a DB check constraint consistent with existing phone normalization policy

Important:
- do not change operator callback number route naming just because the persistence target is `users`
- the route/service product language remains callback / forwarding number

#### 2. orgUnit fallback persistence
This seam already exists in repo reality.

Preserve and use:
- `apps/connectshyft-api/src/modules/connectshyft/escalationConfig.ts`
- `connectshyft.cs_org_unit_escalation_config`
- `default_operator_phone_e164`

Do not create a new table.

## Service contract changes

### 1. `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
This service already exists and must become the single runtime resolution source for operator destination.

Locked resolution order:
1. operator callback number from `operatorCallbackNumbers.ts`
2. orgUnit fallback from `escalationConfig.ts` field `default_operator_phone_e164`
3. unresolved

Required return shape extension if needed:
```ts
{
  value: string | null;
  source: 'callback_number' | 'orgunit_default' | 'none';
  normalized: boolean;
}
```

Rules:
- do not add more fallback layers in this slice
- do not query unrelated profile/settings stores
- this resolver is the single source for runtime operator destination resolution

### 2. `apps/connectshyft-api/src/modules/connectshyft/telephonyReadiness.ts`
Preserve:
- `AsyncConnectShyftTelephonyReadinessService`
- `inspectReadiness(...)`

Locked changes:
- compute SMS readiness now
- compute degraded mode now
- reuse `operatorDestinationResolver.ts`
- reuse number-mapping/provider readiness already present
- keep current voice readiness truth intact unless a bug must be fixed to support the new shared resolver

### 3. `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`
Locked changes:
- if this seam is currently using stub/non-user persistence, converge it to the canonical `users.phone_e164` storage path
- preserve existing external API contract returned to handlers
- preserve read/write timestamps if already present in return contract

Do not create a second callback-number storage path.

## Runtime enforcement contract

### Existing outbound action ownership to preserve
- thread call path remains owned by:
  - `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`
  - existing outbound core in the router/service domain

- thread message path remains owned by:
  - `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadMessage.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`

### Locked enforcement changes
Before provider dispatch:
- call path must check voice readiness
- message path must check SMS readiness

Required refusal codes:
- `CONNECTSHYFT_VOICE_NOT_READY`
- `CONNECTSHYFT_SMS_NOT_READY`

Allowed degraded behavior:
- if voice or SMS is runnable because orgUnit fallback satisfies readiness, allow dispatch
- surface degraded mode in response/UI where current response contract has room
- do not block merely because callback number is not personal if orgUnit fallback makes the channel runnable

Rules:
- refusal must happen before provider dispatch
- refusal must not fabricate success side effects
- refusal must preserve current contextual feedback pattern already used by outbound actions

## Frontend contract

### Existing frontend settings surface to preserve
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftSettingsView.vue`
- `apps/connectshyft-web/src/features/connectshyft/telephonySettings.ts`

### Locked frontend scope
This slice extends the existing Settings view. It does not create a new settings route family.

Required UI behavior:
1. preserve callback number form
2. preserve readiness chip/message surface
3. extend readiness display to show:
   - SMS ready / blocked
   - Voice ready / blocked
   - degraded mode when orgUnit fallback is active
4. keep user input in ordinary phone format
5. use existing fetch/save helpers, extending them rather than replacing them

### Optional UI addition inside existing settings view only
Add a read-only “OrgUnit fallback active” indicator when `operatorPhoneSource === 'orgunit_default'`.

Do not add escalation-config editing to the volunteer/operator settings page unless the current role model already permits it there. OrgUnit fallback editing remains on the existing escalation settings surface.

### Existing escalation settings frontend seam to preserve
- `apps/connectshyft-web/src/features/connectshyft/escalation.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftEscalationSettingsView.vue`

Locked change:
- extend existing escalation settings client payload to include `defaultOperatorPhoneE164`
- do not create a second admin page

## Hard Stop Checkpoint 1 — Backend persistence and service convergence

### Scope
Implement only:
1. shared migration for canonical callback-number persistence on `users`
2. any required app-level migration wrappers/tests following repo convention
3. convergence of `operatorCallbackNumbers.ts` onto canonical persistence
4. use of existing `default_operator_phone_e164` field on escalation config seam
5. unit tests for callback-number persistence + escalation config preservation

### Files in scope
- `shared/database/migrations/<new_migration>.ts`
- `apps/connectshyft-api/src/migrations/<new_wrapper_if_repo_requires>.ts`
- `apps/connectshyft-api/src/migrations/__tests__/<new_migration_test>.ts`
- `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`
- `apps/connectshyft-api/src/modules/connectshyft/escalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/operatorCallbackNumbers.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/escalationConfig.test.ts`

### Required outcomes
- operator callback number reads/writes canonically
- escalation config preserves/stores `default_operator_phone_e164`
- no route/handler changes yet

### Validation
Run only targeted migration and service tests touched by this checkpoint.

### Hard stop
Stop after Checkpoint 1.
Report:
- exact files changed
- exact migrations added
- targeted test results
- blockers only if real

Do not continue to Checkpoint 2.

## Hard Stop Checkpoint 2 — Readiness contract extension

### Scope
Implement only:
1. extend `operatorDestinationResolver.ts`
2. extend `telephonyReadiness.ts`
3. extend `getConnectTelephonyReadiness.ts`
4. keep existing `/telephony-readiness` route intact
5. add/extend readiness tests

### Files in scope
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/telephonyReadiness.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectTelephonyReadiness.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/telephonySettingsContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/operatorDestinationResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/telephonyReadiness.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.telephony-runtime.characterization.test.ts`

### Required outcomes
- readiness returns SMS + Voice channel truth
- readiness returns `operatorPhoneSource`
- readiness returns `degradedMode`
- readiness still preserves current voice-forwarding/callback-number semantics
- no dispatch enforcement yet

### Validation
Run targeted readiness tests only.

### Hard stop
Stop after Checkpoint 2.
Report:
- exact files changed
- readiness contract diff
- targeted test results
- blockers only if real

Do not continue to Checkpoint 3.

## Hard Stop Checkpoint 3 — Runtime dispatch enforcement

### Scope
Implement only:
1. call-path readiness enforcement
2. message-path readiness enforcement
3. preserve current contextual refusal presentation style
4. add/extend outbound action characterization tests

### Files in scope
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadMessage.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`
- existing outbound router/core only where strictly necessary
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts`

### Required outcomes
- voice dispatch refuses with `CONNECTSHYFT_VOICE_NOT_READY` when voice readiness is false
- SMS dispatch refuses with `CONNECTSHYFT_SMS_NOT_READY` when SMS readiness is false
- degraded mode remains allowed if the requested channel is runnable
- refusal occurs before provider dispatch
- no provider/bridge redesign

### Validation
Run targeted outbound action suites only.

### Hard stop
Stop after Checkpoint 3.
Report:
- exact files changed
- refusal codes added
- targeted test results
- blockers only if real

Do not continue to Checkpoint 4.

## Hard Stop Checkpoint 4 — Settings and context surfaces

### Scope
Implement only:
1. extend existing context/availability handlers with telephony summary
2. extend escalation config route payload for `defaultOperatorPhoneE164`
3. preserve current settings navigation surface
4. add/extend route characterization tests

### Files in scope
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectAvailability.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/escalationConfigContext.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.settings-and-availability.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.escalation-config.characterization.test.ts`

### Required outcomes
- context surfaces telephony summary
- availability surfaces telephony readiness summary for settings-capable callers
- escalation config read/write includes `defaultOperatorPhoneE164`
- settings navigation remains anchored to the current settings family

### Validation
Run targeted settings/context/escalation characterization suites only.

### Hard stop
Stop after Checkpoint 4.
Report:
- exact files changed
- payload contract changes
- targeted test results
- blockers only if real

Do not continue to Checkpoint 5.

## Hard Stop Checkpoint 5 — Frontend settings convergence

### Scope
Implement only:
1. extend existing telephony settings client contract
2. extend Settings view to show SMS + Voice readiness and degraded mode
3. preserve callback-number form
4. extend escalation settings client/view for orgUnit fallback phone
5. extend frontend tests only for this surface

### Files in scope
- `apps/connectshyft-web/src/features/connectshyft/telephonySettings.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftSettingsView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue` only if copy/navigation must be updated for the existing settings entry
- `apps/connectshyft-web/src/features/connectshyft/escalation.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftEscalationSettingsView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/__tests__/ConnectShyftSettingsView.test.ts`

### Required outcomes
- callback-number settings still work
- telephony readiness now shows both channels
- degraded mode visible
- orgUnit fallback editable on escalation settings surface
- no new settings route family invented

### Validation
Run frontend tests for settings/escalation surfaces touched by this checkpoint.

### Hard stop
Stop after Checkpoint 5.
Report:
- exact files changed
- frontend contract changes
- targeted test results
- ready/not-ready recommendation for next slice

Do not continue further.

## Non-goals
Do not:
- rename `/telephony-readiness`
- invent `/readiness`
- invent new profile routes
- create a separate telephony config table/service outside escalation config and operator callback number seams
- redesign bridge logic
- redesign Telnyx provider logic
- redesign settings IA
- fold this work into ops visibility
- change PeopleCore/identity behavior in this slice

## Definition of done
Slice 19 is done only when:
- operator callback number is canonically persisted
- orgUnit fallback phone is canonically persisted on escalation config seam
- telephony readiness returns SMS + Voice channel truth
- runtime dispatch blocks when the requested channel is not ready
- degraded mode is surfaced when orgUnit fallback is carrying readiness
- existing settings/context/availability surfaces remain intact and are extended, not replaced
- frontend settings surfaces reflect the new readiness truth
- no new ghost routes or duplicate config systems were introduced

## Codex execution rule
Execute exactly one checkpoint at a time.
Stop at each checkpoint boundary.
Do not continue automatically.
Do not expand scope.
Do not replace existing route families or handler ownership.
