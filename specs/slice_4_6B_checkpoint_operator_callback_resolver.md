# Slice 4.6B Checkpoint — Operator Callback Resolver Cutover

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/operatorDestinationResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/operatorCallbackNumbers.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts`

## 2. FUNCTION SIGNATURES (Exact)
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

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
-  async getUserPhone(input: { tenantId: string; userId: string; }): Promise<{ userId: string; phoneNumber: string | null } | null> {
-    // user-table lookup path
-  }
+  async getUserPhone(input: { tenantId: string; userId: string; }): Promise<{ userId: string; phoneNumber: string | null } | null> {
+    const row = await knex
+      .withSchema('connectshyft')
+      .table('cs_operator_callback_numbers')
+      .where({
+        tenant_id: input.tenantId,
+        user_id: input.userId,
+      })
+      .first(['user_id', 'callback_number_e164']);
+    return row
+      ? { userId: row.user_id, phoneNumber: row.callback_number_e164 }
+      : null;
+  }
```

```diff
- operatorDestinationSource: 'none'
+ operatorDestinationSource: 'operator_callback_number'
```

## 4. REQUIRED CHANGES
1. Cut `getUserPhone()` over to the canonical callback-number table.
2. Remove dependency on non-canonical user-phone lookup for outbound voice.
3. Preserve existing fallback order after canonical callback lookup fails:
   - claimed user
   - actor user
   - orgUnit default if configured
4. Update characterization tests to assert callback-table-based resolution.

## 5. DATA MUTATIONS
Reads only:
- `connectshyft.cs_operator_callback_numbers.tenant_id`
- `connectshyft.cs_operator_callback_numbers.user_id`
- `connectshyft.cs_operator_callback_numbers.callback_number_e164`

## 6. GUARDS (MANDATORY)
- Return null when callback row absent.
- Return null when callback number is blank or invalid after normalization.
- Do not write to callback table in the resolver.
- Keep refusal code unchanged when all resolution paths fail.

## 7. STOP CONDITION (VERIFIABLE)
One SQL query must confirm canonical callback row exists:

```sql
select callback_number_e164
from connectshyft.cs_operator_callback_numbers
where tenant_id = '942de4d9-3e9d-4ff9-98eb-b498fd4f496a'
  and user_id = 'f3bb331f-8adb-4664-926b-66e01c1881a7';
```

And one curl or test must show outbound call no longer returns `CONNECTSHYFT_OPERATOR_DESTINATION_MISSING` for thread `f3fe1191-f90a-4c7d-82ef-f77ce5dff8ba`.

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): resolve operator destination from callback number store"
```

## 9. PROHIBITED
- No lookup from unrelated user profile phone fields
- No silent fallback to null when callback row exists and is valid
