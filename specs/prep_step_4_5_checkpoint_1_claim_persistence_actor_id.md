# CHECKPOINT 1 — CLAIM PERSISTENCE AND ACTOR-ID NORMALIZATION

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/threadLifecycleContext.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- relevant thread lifecycle test files

## 2. FUNCTION SIGNATURES (Exact)
```ts
async transitionThreadState(input: ThreadStoreTransitionInput): Promise<ThreadPersistenceTransitionResult>
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
- const normalizedActorUserId = normalizeUuid(input.actorUserId);
+ const normalizedActorUserId = normalizeString(input.actorUserId) || null;
```

```diff
+ logger.error('connectshyft thread transition persistence failed', {
+   tenantId: input.tenantId,
+   threadId: input.threadId,
+   nextState: input.nextState,
+   actorUserId: input.actorUserId,
+   error: errorCaught,
+ });
```

## 4. REQUIRED CHANGES
- Remove UUID-only normalization from claim transition actor handling.
- Keep actor-required guard for non-UNCLAIMED transitions.
- Persist stable text actor IDs.
- Add explicit logging around persistence failure.

## 5. DATA MUTATIONS
On claim:
- `state='CLAIMED'`
- `claimed_by_user_id=actorUserId`
- `claimed_at_utc=now()`
- `updated_by_user_id=actorUserId`
- `updated_at_utc=now()`

## 6. GUARDS (MANDATORY)
- Empty actor id remains invalid.
- No lifecycle policy changes.

## 7. STOP CONDITION (VERIFIABLE)
- Integration or route test proves claim succeeds with non-UUID actor id.

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): allow thread claim persistence for text actor ids"
```

## 9. PROHIBITED
- No broad lifecycle redesign.
