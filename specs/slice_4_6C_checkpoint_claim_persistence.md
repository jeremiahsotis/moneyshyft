# Slice 4.6C Checkpoint — Claim Persistence Repair

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/threadLifecycleContext.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-claim.characterization.test.ts`

## 2. FUNCTION SIGNATURES (Exact)
```ts
async transitionThreadState(
  input: ThreadStoreTransitionInput,
): Promise<ThreadPersistenceTransitionResult>
```

```ts
export const executeConnectShyftThreadLifecycleAction = async (
  req: Request,
  res: Response,
  action: ConnectShyftLifecycleAction,
): Promise<void>
```

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
+      logger.error('connectshyft thread transition persistence failed', {
+        tenantId: input.tenantId,
+        threadId: input.threadId,
+        nextState: input.nextState,
+        actorUserId: input.actorUserId,
+        updatePayload,
+        error: errorCaught,
+      });
```

```diff
-      return buildThreadPersistenceUnavailableRefusal(...)
+      return buildThreadPersistenceUnavailableRefusal(...actual failure classification...)
```

```diff
+      claimed_by_user_id: normalizedActorUserId,
+      claimed_at_utc: nowValue,
+      updated_by_user_id: normalizedActorUserId,
+      updated_at_utc: nowValue,
```

## 4. REQUIRED CHANGES
1. Preserve current lifecycle guard behavior.
2. Instrument the exact failure inside `transitionThreadState()`.
3. Ensure claim update payload matches the successful manual SQL mutation.
4. Remove any application-layer normalization or update-path bug that prevents persistence.
5. Keep route refusal envelope shape unchanged if a real persistence error remains.

## 5. DATA MUTATIONS
Write on claim:
- `connectshyft.cs_threads.claimed_by_user_id = actorUserId`
- `connectshyft.cs_threads.claimed_at_utc = now()`
- `connectshyft.cs_threads.updated_by_user_id = actorUserId`
- `connectshyft.cs_threads.updated_at_utc = now()`

Read:
- existing thread state by `(tenant_id, id)`

## 6. GUARDS (MANDATORY)
- actor required for non-UNCLAIMED transitions
- no state transition outside current lifecycle rules
- do not mutate close fields during claim
- do not swallow actual persistence errors without logging

## 7. STOP CONDITION (VERIFIABLE)
One curl or test must succeed:

```bash
curl -vk -X POST https://connect.shyftunity.com/api/v1/connectshyft/threads/f3fe1191-f90a-4c7d-82ef-f77ce5dff8ba/claim ...
```

And one SQL query must show:

```sql
select claimed_by_user_id, claimed_at_utc
from connectshyft.cs_threads
where id = 'f3fe1191-f90a-4c7d-82ef-f77ce5dff8ba';
```

Expected:
- `claimed_by_user_id = 'f3bb331f-8adb-4664-926b-66e01c1881a7'`
- `claimed_at_utc is not null`

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): repair thread claim persistence path"
```

## 9. PROHIBITED
- No direct SQL shortcuts in route handlers
- No bypass of lifecycle service/store boundary
