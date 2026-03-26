# ConnectShyft Stabilization — Exact Patch Diff Bundle

Locked architectural decision: **Path A — strict PeopleCore**.

This bundle contains:
1. Claim fix
2. Outbound SMS target resolution fix
3. Inbound-first SMS strict-PeopleCore fix
4. Immediate misleading UI copy cleanup

## PATCH 1 — Claim fix

### File
`apps/connectshyft-api/src/modules/connectshyft/threads.ts`

```diff
@@
-      const normalizedActorUserId = normalizeUuid(input.actorUserId);
+      const normalizedActorUserId = normalizeString(input.actorUserId) || null;
```

### File
`apps/connectshyft-api/src/modules/connectshyft/http/threadLifecycleContext.ts`

```diff
@@
-  return UUID_PATTERN.test(normalized) ? normalized : null;
+  return normalized;
```

## PATCH 2 — Outbound SMS target resolution (strict PeopleCore)

### New file
`apps/connectshyft-api/src/modules/connectshyft/threadSmsTargetResolver.ts`

```ts
import { validatePhoneForChannel } from '../../../../../domains/communication';
import { peopleCoreServiceAsync } from '../peoplecore/service';

type ResolveThreadSmsTargetInput = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
};

type ResolveThreadSmsTargetResult =
  | {
      ok: true;
      contactPointId: string;
      normalizedValue: string;
    }
  | {
      ok: false;
      code:
        | 'CONNECTSHYFT_SMS_TARGET_REQUIRED'
        | 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS'
        | 'CONNECTSHYFT_SMS_TARGET_INVALID';
      message: string;
      reason: 'missing_target' | 'ambiguous_target' | 'invalid_target';
    };

export async function resolveThreadSmsTarget(
  input: ResolveThreadSmsTargetInput,
): Promise<ResolveThreadSmsTargetResult> {
  const currentLinks = await peopleCoreServiceAsync.listCurrentContactPointLinksBySubject({
    tenantId: input.tenantId,
    subjectType: 'person',
    subjectId: input.personId,
  });

  const personLinks = currentLinks.filter((link) =>
    link.subjectType === 'person'
    && link.subjectId === input.personId
    && link.isCurrent !== false,
  );

  if (personLinks.length === 0) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      message: 'This conversation cannot send a text until a textable contact is linked to the person.',
      reason: 'missing_target',
    };
  }

  const contactPoints = await Promise.all(
    personLinks.map((link) =>
      peopleCoreServiceAsync.getContactPoint({
        tenantId: input.tenantId,
        contactPointId: link.contactPointId,
      })),
  );

  const smsCandidates = contactPoints
    .filter((contactPoint): contactPoint is NonNullable<typeof contactPoint> => Boolean(contactPoint))
    .filter((contactPoint) => contactPoint.type === 'phone')
    .filter((contactPoint) => validatePhoneForChannel(contactPoint.normalizedValue, 'sms').ok);

  if (smsCandidates.length === 0) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      message: 'This conversation cannot send a text until a textable contact is linked to the person.',
      reason: 'missing_target',
    };
  }

  if (smsCandidates.length > 1) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS',
      message: 'This conversation has more than one active textable contact and needs one clear texting target.',
      reason: 'ambiguous_target',
    };
  }

  const selected = smsCandidates[0];

  return {
    ok: true,
    contactPointId: selected.id,
    normalizedValue: selected.normalizedValue,
  };
}
```

### Route patch
Add import in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`:

```diff
+import { resolveThreadSmsTarget } from '../../../../modules/connectshyft/threadSmsTargetResolver';
```

Then in the outbound thread-message SMS path:

```diff
+    const smsTarget = await resolveThreadSmsTarget({
+      tenantId: context.tenantId,
+      orgUnitId: context.orgUnitId,
+      threadId,
+      personId: threadDetail.personId,
+    });
+
+    if (!smsTarget.ok) {
+      refusal(res, {
+        code: smsTarget.code,
+        message: smsTarget.message,
+        refusalType: 'business',
+        httpStatus: 200,
+        data: {
+          context,
+          threadId,
+          targetResolution: {
+            deterministic: smsTarget.reason !== 'ambiguous_target',
+            source: 'peoplecore_current_contact_point',
+            reason: smsTarget.reason,
+          },
+        },
+      });
+      return;
+    }
```

## PATCH 3 — Inbound-first SMS strict-PeopleCore fix

### File
`apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

Replace the early `neighbor_unresolved` refusal branch with PeopleCore identity resolution, provisional creation, and ambiguity-review creation before thread ensure.

## PATCH 4 — Immediate misleading UI copy cleanup

### File
`apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

```diff
- Persist one valid mapped ConnectShyft sender number on the thread before sending SMS.
+ This conversation cannot send a text until a texting number and a textable contact are both ready.
```

```diff
- Mapped outbound number configured
+ Conversation line selected
```

### File
Settings view file that contains readiness copy

```diff
- Calls and texts are ready.
+ Calling and texting are available when your callback number, conversation line, and contact details are ready.
```
