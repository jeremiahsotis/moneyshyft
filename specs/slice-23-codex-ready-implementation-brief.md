# Slice 23 — Telephony Readiness (Codex‑Ready Implementation Brief)

## 1. OBJECTIVE

Establish a **real, persistent telephony readiness gate** for ConnectShyft. Eliminates the previous “fake readiness” toggle by persisting operator callback numbers and orgUnit number mappings, reading this data from the database, and determining whether outgoing SMS/voice dispatches are allowed. Operators must be able to view and update their callback number in the UI. Dispatch must block with a clear reason whenever a prerequisite (provider, number mapping or callback number) is not satisfied.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **Callback number persistence** – Operator callback numbers are stored in the `connectshyft.cs_operator_callback_numbers` table keyed by `(tenant_id, user_id)`. The canonical fields are `callback_number_e164` and `callback_number_raw_input`; timestamps are maintained by the table itself. The `users.phone_e164` column is no longer authoritative for callback routing.
2. **OrgUnit number mappings** – Outgoing voice and SMS use active orgUnit number mappings from `connectshyft_number_mappings` (`twilio_number_e164`). At least one active mapping is required for dispatch readiness.
3. **Single readiness service** – `AsyncConnectShyftTelephonyReadinessService` composes provider resolution, number mapping inspection, callback number persistence and operator phone resolution to compute readiness. This service becomes the sole source of truth for UI and dispatch gating.
4. **Blocking states** – Dispatch may be either `READY` or `NOT_READY`. When not ready the service surfaces an array of explicit blocking reasons (provider misconfiguration, missing number mapping, missing/invalid callback number, invalid orgUnit fallback). A “degraded mode” (falling back to orgUnit default) is still exposed but no longer marks the system ready – operators must correct their callback number to exit degraded mode.
5. **No test bypass** – The `ENABLE_TEST_CONNECTSHYFT_FLAGS` and related environment toggles are removed for production readiness; readiness always reflects the true database state. Unit tests may still stub services directly.

## 3. EXECUTION FLOW

1. **Inspect readiness** (`inspectReadiness`)
   1. Resolve provider via `resolveConnectShyftProviderAdapter`. If disabled or unavailable, record a blocking reason (`providerReady = false`).
   2. Fetch all number mappings for the tenant/orgUnit via `listMappings`. Filter active mappings. If none exist, append the `CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED` blocking reason.
   3. Fetch the operator’s callback number via `getCurrentCallbackNumber` (using the new callback‑number store). If no record exists, append `CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING`. If the number is invalid for voice or SMS channels, append `CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID`.
   4. Resolve the effective operator phone via `resolveConnectShyftTelephonyOperatorPhone`, passing the E.164 callback number and indicating whether persistence is available. This resolver may fall back to the orgUnit default. If fallback occurs, append a **degraded mode** reason; in Slice 23 degraded mode does **not** mark the system ready.
   5. Determine channel readiness:
      - **voiceReady**: provider ready **and** webhook signature configured **and** at least one active number mapping **and** operator phone is valid for voice.
      - **smsReady**: provider ready **and** webhook signature configured **and** at least one active number mapping **and** operator phone is valid for SMS.
      - **bridgeCallRunnable / messageDispatchRunnable**: identical to voiceReady / smsReady. If either is false, dispatch must return a forbidden envelope with the blocking reasons.
   6. Return a `ConnectShyftTelephonyReadiness` DTO with all flags, the canonical callback number (or null), operator phone source, blocking reasons and next actions.

2. **Set callback number** (`setCallbackNumber`)
   1. Accept `(tenantId, userId, callbackNumber: unknown)`.
   2. Validate the input via `validateCallbackNumber`. Reject blank or non‑E.164 numbers with a `CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_REQUIRED/INVALID` result.
   3. Upsert the record into `connectshyft.cs_operator_callback_numbers`. If a row exists, update `callback_number_e164` and `callback_number_raw_input`; otherwise insert a new row. Return the persisted record with normalized `callbackNumberRawInput`.
   4. Surface persistence errors (missing table, connection failure) as `ConnectShyftOperatorCallbackNumberPersistenceUnavailableError`.

3. **Get callback number** (`getCurrentCallbackNumber`)
   1. Query `connectshyft.cs_operator_callback_numbers` by `(tenant_id, user_id)`. If no row is found, return `null`. Map the DB row to `ConnectShyftOperatorCallbackNumber` (ISO timestamps).
   2. Normalize `callbackNumberRawInput` to a US display format via `formatDisplayPhone`. Return the normalized record.
   3. Surface persistence errors as `ConnectShyftOperatorCallbackNumberPersistenceUnavailableError`.

4. **HTTP handlers**
   - **GET /api/v1/connectshyft/telephony-readiness** – Resolve access context, call `inspectReadiness`, and return a success envelope with the readiness DTO. When not ready the `blockingReasons` array explains why.
   - **GET /api/v1/connectshyft/operator/callback-number** – Return the current callback number (or null) via `getCurrentCallbackNumber`. Include `createdAtUtc` and `updatedAtUtc` for the record.
   - **PUT /api/v1/connectshyft/operator/callback-number** – Validate and persist a callback number via `setCallbackNumber`. On success return the saved record; on validation failure return an error envelope with `fieldErrors`; on persistence failure return an unavailable envelope.

## 4. STATE MACHINE

The readiness gate is modelled as a simple machine with the following states:

| State       | Description                                                                                                                               | Transitions                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOT_READY` | At least one blocking reason exists (provider disabled, no active number mapping, missing/invalid callback number, degraded mode active). | Transitions to `READY` when all blocking reasons are cleared via provider configuration, activating a number mapping, or saving a valid callback number. |
| `READY`     | All prerequisites satisfied; both SMS and voice channels are runnable.                                                                    | Remains `READY` while prerequisites remain valid. Transitions to `NOT_READY` when a prerequisite becomes invalid (e.g. callback number removed).         |

`degradedMode` is a flag within the `NOT_READY` state indicating that the system falls back to the orgUnit default phone; dispatch is still blocked until the operator saves a valid callback number.

## 5. DATABASE CONTRACTS

### 5.1 `connectshyft.cs_operator_callback_numbers`

| Column                      | Type        | Constraints                                          |
| --------------------------- | ----------- | ---------------------------------------------------- |
| `tenant_id`                 | TEXT        | **PK**, references tenant; cannot be null            |
| `user_id`                   | TEXT        | **PK**, references user; cannot be null              |
| `callback_number_e164`      | TEXT        | Must match `^\+[1-9][0-9]{1,14}$`; cannot be null    |
| `callback_number_raw_input` | TEXT        | Raw input as entered by user; cannot be null         |
| `created_at_utc`            | TIMESTAMPTZ | Defaults to `NOW()`, records creation time           |
| `updated_at_utc`            | TIMESTAMPTZ | Defaults to `NOW()` on insert, updated on each write |

**Primary key:** `(tenant_id, user_id)`. **Check constraint:** `callback_number_e164` matches E.164. Migration file `20260322120000_create_connectshyft_operator_callback_numbers.ts` creates this schema.

### 5.2 `connectshyft_number_mappings`

Existing table used by Slice 22. Columns include `id`, `tenant_id`, `org_unit_id`, `twilio_number_e164`, `label`, `is_active`, `created_at_utc`, `updated_at_utc`. An **active** mapping (`is_active = true`) is required for telephony readiness.

## 6. SERVICE LAYER (STRICT)

### 6.1 `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`

| Function / Signature                                                                                                                                    | Responsibility                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async getCurrentCallbackNumber(input: { tenantId: string; userId: string; }): Promise<ConnectShyftOperatorCallbackNumber                               | null>`                                                                                                                                                                                                        | Reads the operator’s callback number from `cs_operator_callback_numbers`; returns normalized record or null. Throws `ConnectShyftOperatorCallbackNumberPersistenceUnavailableError` on missing table or DB connection error. |
| `async setCallbackNumber(input: { tenantId: string; userId: string; callbackNumber: unknown; }): Promise<ConnectShyftOperatorCallbackNumberSaveResult>` | Validates and upserts a callback number. Returns success with persisted record or a refusal with field errors. Throws `ConnectShyftOperatorCallbackNumberPersistenceUnavailableError` on persistence failure. |
| `validateConnectShyftOperatorCallbackNumber(value: unknown): ValidatedCallbackNumber`                                                                   | Pure function used by handlers for pre‑validation.                                                                                                                                                            |

### 6.2 `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`

| Function / Signature                                                                            | Responsibility                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `async listMappings(tenantId: string, orgUnitId: string): Promise<ConnectShyftNumberMapping[]>` | Returns all number mappings for the given tenant/orgUnit. Only mappings with `is_active = true` count towards readiness. |

### 6.3 `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`

| Function / Signature                                                                                                       | Responsibility                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async resolveConnectShyftTelephonyOperatorPhone(input: { tenantId: string; orgUnitId: string; callbackNumberE164?: string | null; callbackNumberPersistenceAvailable?: boolean; }): Promise<ConnectShyftTelephonyOperatorPhoneResolution>` | Determines which phone number to use for dispatch: the operator’s callback number if valid; otherwise the orgUnit fallback. Returns `source` (`'callback_number'`, `'orgunit_default'` or `'none'`), the chosen `value`, a `normalized` boolean, and `orgUnitDefaultStatus` (`'valid'` or `'invalid'`). |

### 6.4 `apps/connectshyft-api/src/modules/connectshyft/telephonyReadiness.ts`

| Function / Signature                                                                                             | Responsibility                                        |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async inspectReadiness(input: { tenantId: string; orgUnitId: string; userId: string; requestedProvider?: string | null; providerRegistryHeaders?: Record<string, string | undefined>; }): Promise<ConnectShyftTelephonyReadiness>` | Computes telephony readiness. Resolves the provider, number mappings, callback number, and operator phone; builds blocking reasons and next actions; computes flags (`providerReady`, `orgUnitNumberMappingReady`, `callbackNumberConfigured`, `callbackNumberNormalized`, `bridgeCallRunnable`, `messageDispatchRunnable`, `degradedMode`). |

### 6.5 HTTP Handlers

| File & Function                                                                                                | Signature                                                                                             | Responsibility |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------- |
| `handlers/getConnectTelephonyReadiness.ts` `getConnectTelephonyReadiness(req: Request, res: Response)`         | Resolve access context, call `inspectReadiness`, return success envelope with readiness DTO.          |
| `handlers/getConnectOperatorCallbackNumber.ts` `getConnectOperatorCallbackNumber(req: Request, res: Response)` | Fetch and return the current callback number using `getCurrentCallbackNumber`.                        |
| `handlers/putConnectOperatorCallbackNumber.ts` `putConnectOperatorCallbackNumber(req: Request, res: Response)` | Validate and persist the callback number via `setCallbackNumber`; return success or refusal envelope. |

## 7. PROVIDER / INTEGRATION CONTRACTS

Telephony readiness integrates with a provider registry via `resolveConnectShyftProviderAdapter`. The registry returns either a refusal (provider disabled/unavailable) or an adapter that exposes:

```ts
interface ConnectShyftProviderAdapter {
  adapterInterfaceVersion: "v1";
  verifyWebhook(req: WebhookVerificationInput): WebhookVerificationResult;
}
```

For readiness, only the verifyWebhook operation is used. The result must have ok: true for the webhook signature to be considered configured. No external API calls are made in Slice 23; providers that require additional configuration must be fully configured before readiness will pass.

### 8. EVENT HANDLING

No domain events are produced or consumed in Slice 23. Callback number changes are side‑effect free; provider configuration and number mapping changes are outside the scope of this slice. Future slices (e.g. telephony lifecycle) will introduce events such as `call.started`, `voicemail.recorded`, etc., but they are not part of this implementation.

## 9. IDEMPOTENCY RULES

1. Set callback number – Idempotent. Re‑saving the same E.164 number updates the timestamp but not the value. Replacing the number overwrites the existing record. There is at most one record per (`tenant_id`, `user_id`).
2. Inspect readiness – Pure read. Multiple calls return the same result until underlying data changes. Does not mutate state.
3. List mappings – Pure read. No side effects.

Guard conditions should prevent duplicate inserts:

```ts
// saveCallbackNumber
const row = await knex("connectshyft.cs_operator_callback_numbers")
  .where({ tenant_id: input.tenantId, user_id: input.userId })
  .first();
if (row) {
  await knex("connectshyft.cs_operator_callback_numbers")
    .where({ tenant_id: input.tenantId, user_id: input.userId })
    .update({
      callback_number_e164: input.callbackNumberE164,
      callback_number_raw_input: input.callbackNumberRawInput,
      updated_at_utc: knex.fn.now(),
    });
} else {
  await knex("connectshyft.cs_operator_callback_numbers").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    callback_number_e164: input.callbackNumberE164,
    callback_number_raw_input: input.callbackNumberRawInput,
  });
}
```

## 10. FAILURE MODES

1. **Provider disabled/unavailable** – inspectReadiness returns providerReady = false with a blocking reason (`CONNECTSHYFT_PROVIDER_DISABLED` or `CONNECTSHYFT_PROVIDER_UNAVAILABLE`).
2. **No active number mapping** – `orgUnitNumberMappingReady = false`, blocking reason `CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED`.
3. **Missing callback number** – `callbackNumberConfigured = false`, blocking reason `CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING`.
4. **Invalid callback number** – `callbackNumberConfigured = true`, `callbackNumberNormalized = false`, blocking reason `CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID`.
5. **Persistence unavailable** – `getCurrentCallbackNumber` or `setCallbackNumber` throws `ConnectShyftOperatorCallbackNumberPersistenceUnavailableError`; HTTP handlers must translate to a 503 envelope with message Operator callback number storage is temporarily unavailable.
6. **Invalid orgUnit fallback** – When fallback is attempted but the orgUnit default phone is invalid for the channel, append `CONNECTSHYFT_ORGUNIT_DEFAULT_OPERATOR_PHONE_INVALID` and block dispatch.

## 11. TEST CONTRACT

### 11.1 Unit Tests (`apps/connectshyft-api/src/modules/connectshyft/tests`)

1. `telephonyReadiness.test.ts` – Add scenarios verifying the new real readiness gate:
   - Returns `NOT_READY` with `callbackNumberStatus: 'missing'` when the operator has no callback number record.
   - Returns `NOT_READY` with `callbackNumberStatus: 'invalid'` when the persisted callback number fails voice validation (e.g. uncallable number).
   - Returns `NOT_READY` with `numberMappingStatus: 'missing'` when there are no active number mappings.
   - Returns `NOT_READY` with `providerStatus: 'disabled'` when the provider is disabled.
   - Returns `READY` when provider is enabled, an active number mapping exists, and the operator has a valid callback number.
2. `operatorCallbackNumbers.test.ts` – Update tests to verify persistence via the new table:
   - `getCurrentCallbackNumber` and `setCallbackNumber` operate on `cs_operator_callback_numbers` (verify by seeding the table and asserting the returned rows).
   - Saving a number twice updates the existing row (updated timestamp changes).
   - Missing table or database connection throws `ConnectShyftOperatorCallbackNumberPersistenceUnavailableError`.

### 11.2 Integration Tests (`tests/integration/connectshyft-api`)

1. `telephony-runtime.characterization.test.ts` – Update to remove any bypass flags or mocks. The test should perform end‑to‑end calls to /telephony-readiness with different database states:
   - Without any number mappings or callback numbers, the response contains `blockingReasons` and `bridgeCallRunnable = false`.
   - After inserting an active number mapping and saving a valid callback number, the response shows `bridgeCallRunnable = true` and no blocking reasons.
2. `operatorCallbackNumber` endpoints – Integration tests for `GET /operator/callback-number` and `PUT /operator/callback-number` verifying validation, persistence and error handling.

## 12. CHECKPOINTS

Checkpoint 1 — Create Persistent Callback Number Store

### FILES:

1. `apps/connectshyft-api/src/migrations/20260322120000_create_connectshyft_operator_callback_numbers.ts` – already exists. Ensure it is the latest migration and executed via `migration-runner`. No change required unless missing in production.
2. `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts` – modify `KnexConnectShyftOperatorCallbackNumberStore` to use `cs_operator_callback_numbers` instead of the users table.

### FUNCTION SIGNATURES:\*\*

The signatures of `getCurrentCallbackNumber`, `setCallbackNumber`, `validateConnectShyftOperatorCallbackNumber` and related types remain unchanged.

### LINE‑LEVEL DIFF EXPECTATIONS:

```diff
*** Update File: apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts
@@
-export class KnexConnectShyftOperatorCallbackNumberStore
-implements ConnectShyftOperatorCallbackNumberStore {
-  constructor(private readonly knexClient: Knex = db) {}
-
-  private usersTable() {
-    return this.knexClient.table<DbUserOperatorCallbackNumberRow>('users');
-  }
+export class KnexConnectShyftOperatorCallbackNumberStore
+implements ConnectShyftOperatorCallbackNumberStore {
+  constructor(private readonly knexClient: Knex = db) {}
+
+  private table() {
+    return this.knexClient.withSchema('connectshyft')
+      .table<DbOperatorCallbackNumberRow>('cs_operator_callback_numbers');
+  }
@@
-  async getCallbackNumber(input: {
-    tenantId: string;
-    userId: string;
-  }): Promise<ConnectShyftOperatorCallbackNumber | null> {
-    const row = await this.usersTable()
-      .where({
-        id: input.userId,
-        household_id: input.tenantId,
-      })
-      .first<DbUserOperatorCallbackNumberRow>([
-        'id',
-        'household_id',
-        'phone_e164',
-        'created_at',
-        'updated_at',
-      ]);
-    return row ? mapUserRowToOperatorCallbackNumber(row) : null;
-  }
+  async getCallbackNumber(input: {
+    tenantId: string;
+    userId: string;
+  }): Promise<ConnectShyftOperatorCallbackNumber | null> {
+    const row = await this.table()
+      .where({ tenant_id: input.tenantId, user_id: input.userId })
+      .first<DbOperatorCallbackNumberRow>();
+    return row ? mapDbRowToOperatorCallbackNumber(row) : null;
+  }
@@
-  async saveCallbackNumber(input: {
-    tenantId: string;
-    userId: string;
-    callbackNumberE164: string;
-    callbackNumberRawInput: string;
-  }): Promise<ConnectShyftOperatorCallbackNumber> {
-    const updatedRows = await this.usersTable()
-      .where({
-        id: input.userId,
-        household_id: input.tenantId,
-      })
-      .update({
-        phone_e164: input.callbackNumberE164,
-        updated_at: this.knexClient.fn.now(),
-      }, [
-        'id',
-        'household_id',
-        'phone_e164',
-        'created_at',
-        'updated_at',
-      ]);
-    const [row] = updatedRows as DbUserOperatorCallbackNumberRow[];
-    const callbackNumber = row ? mapUserRowToOperatorCallbackNumber(row) : null;
-    if (!callbackNumber) {
-      throw new Error('Operator callback number user scope is unavailable.');
-    }
-    return callbackNumber;
-  }
+  async saveCallbackNumber(input: {
+    tenantId: string;
+    userId: string;
+    callbackNumberE164: string;
+    callbackNumberRawInput: string;
+  }): Promise<ConnectShyftOperatorCallbackNumber> {
+    const existing = await this.table()
+      .where({ tenant_id: input.tenantId, user_id: input.userId })
+      .first<DbOperatorCallbackNumberRow>();
+    let row: DbOperatorCallbackNumberRow;
+    if (existing) {
+      [row] = await this.table()
+        .where({ tenant_id: input.tenantId, user_id: input.userId })
+        .update({
+          callback_number_e164: input.callbackNumberE164,
+          callback_number_raw_input: input.callbackNumberRawInput,
+          updated_at_utc: this.knexClient.fn.now(),
+        }, '*') as DbOperatorCallbackNumberRow[];
+    } else {
+      [row] = await this.table()
+        .insert({
+          tenant_id: input.tenantId,
+          user_id: input.userId,
+          callback_number_e164: input.callbackNumberE164,
+          callback_number_raw_input: input.callbackNumberRawInput,
+        }, '*') as DbOperatorCallbackNumberRow[];
+    }
+    return mapDbRowToOperatorCallbackNumber(row);
+  }
*** End Patch
```

## 13. Definition of Done

The slice is complete when:

- The callback number migration is applied and accessible via the `migration-runner`.
- `connectshyft-api` reads/writes callback numbers from the `cs_operator_callback_numbers` table and no longer touches `users.phone_e164`.
- `inspectReadiness` correctly reports READY only when provider, number mapping and callback number prerequisites are all satisfied; otherwise it returns `NOT_READY` with explicit blocking reasons.
- The UI exposes `GET` and `PUT` endpoints for callback numbers, and the telephony readiness endpoint displays the proper flags and reasons.
- All new unit and integration tests pass, and existing behaviour is preserved.

## 14. Non‑Goals

This slice does not redesign call/voicemail flows, implement provider auto‑configuration, or modify PeopleCore scoring. It does not automate readiness on deployment; operators must still trigger migrations and update configuration manually. It does not add cross‑lane policies or orchestrate events beyond readiness.

## 15. Future Extension Points – Later slices could:

- Promote the readiness service into a shared package and add Nx targets.
- Send domain events (e.g. telephony.ready, telephony.not_ready) for observability and automatic notification.
- Introduce administrator dashboards for managing number mappings and provider configuration.
- Enable automatic fallback routing or call bridging once readiness is established.
