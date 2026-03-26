# CHECKPOINT 2 — STRICT PEOPLECORE OUTBOUND SMS TARGET RESOLUTION

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- `apps/connectshyft-api/src/modules/peoplecore/service.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threadSmsTargetResolver.ts`
- relevant outbound message tests

## 2. FUNCTION SIGNATURES (Exact)
```ts
async function resolveThreadSmsTarget(input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
}): Promise<
  | { ok: true; contactPointId: string; normalizedValue: string }
  | {
      ok: false;
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED' | 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS' | 'CONNECTSHYFT_SMS_TARGET_INVALID';
      message: string;
      reason: 'missing_target' | 'ambiguous_target' | 'invalid_target';
    }
>
```

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
+ import { resolveThreadSmsTarget } from '../../../../modules/connectshyft/threadSmsTargetResolver';
```

```diff
+ const smsTarget = await resolveThreadSmsTarget({
+   tenantId: context.tenantId,
+   orgUnitId: context.orgUnitId,
+   threadId,
+   personId: threadDetail.personId,
+ });
+ if (!smsTarget.ok) {
+   refusal(res, {
+     code: smsTarget.code,
+     message: smsTarget.message,
+     refusalType: 'business',
+     httpStatus: 200,
+     data: {
+       context,
+       threadId,
+       targetResolution: {
+         deterministic: smsTarget.reason !== 'ambiguous_target',
+         source: 'peoplecore_current_contact_point',
+         reason: smsTarget.reason,
+       },
+     },
+   });
+   return;
+ }
```

## 4. REQUIRED CHANGES
- Add strict PeopleCore SMS target resolver.
- Resolve target only from PeopleCore current person contact points.
- Require exactly one deterministic SMS-capable phone contact point.
- Refuse if none, ambiguous, or invalid.
- No legacy neighbor fallback.

## 5. DATA MUTATIONS
Reads:
- `people.contact_point_links`
- `people.contact_points`
- `connectshyft.cs_threads`

## 6. GUARDS (MANDATORY)
- `thread.person_id` must exist.
- Only current person links count.
- Only phone contact points count.

## 7. STOP CONDITION (VERIFIABLE)
- Integration test proves outbound SMS succeeds only with a PeopleCore current contact point and refuses otherwise.

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): require PeopleCore contact points for outbound sms targets"
```

## 9. PROHIBITED
- No legacy `cs_neighbor_phones` fallback.
