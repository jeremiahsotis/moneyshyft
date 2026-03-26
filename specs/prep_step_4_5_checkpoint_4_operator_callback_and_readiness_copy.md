# CHECKPOINT 4 — OPERATOR CALLBACK READINESS + MISLEADING READINESS COPY CLEANUP

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/telephonyReadiness.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postThreadCallHandler.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `apps/connectshyft-web/src/views/Shell/*`
- shared UI copy helpers if used

## 2. FUNCTION SIGNATURES (Exact)
```ts
async getUserPhone(input: { tenantId: string; userId: string; }): Promise<{ userId: string; phoneNumber: string | null } | null>
```

```ts
async inspectReadiness(input: ConnectShyftTelephonyReadinessInput): Promise<ConnectShyftTelephonyReadiness>
```

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
- .where({
-   id: input.userId,
-   household_id: input.tenantId,
- })
+ .where({
+   id: input.userId,
+ })
```

```diff
- "Mapped outbound number configured"
+ "Conversation line selected"
```

```diff
- "Persist one valid mapped ConnectShyft sender number on the thread before sending SMS."
+ "This conversation cannot send a text until a texting number and a textable contact are both ready."
```

## 4. REQUIRED CHANGES
- Fix operator callback lookup so production user rows resolve correctly.
- Preserve readiness semantics, but reflect actual callback/runtime truth.
- Update thread/settings readiness copy so it does not claim capability that backend has not verified.
- Remove engineering language from user-facing views.

## 5. DATA MUTATIONS
Reads:
- `connectshyft.cs_operator_callback_numbers`
- `connectshyft.cs_org_unit_escalation_config`
- production user table used by callback lookup

## 6. GUARDS (MANDATORY)
- Outbound call must still refuse if callback truly missing.
- UI must not show “ready” unless backend readiness says ready.
- No copy may mention internal mapping/persistence language.

## 7. STOP CONDITION (VERIFIABLE)
- Outbound call integration test succeeds with callback row present or readiness inspection returns callback-ready for production-shaped user row, and grep no longer finds misleading readiness copy.

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): align callback readiness and remove misleading readiness copy"
```

## 9. PROHIBITED
- No fake readiness state.
