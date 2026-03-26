# Slice 4.6A Checkpoint — Canonical Sender Alignment Migration and Resolver Cutover

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/migrations/20260326190000_add_canonical_thread_provider_number_alignment.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/senderNumberResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts`

## 2. FUNCTION SIGNATURES (Exact)
```ts
export async function resolveSenderNumber(
  input: ResolveSenderNumberInput,
  overrides?: ResolveSenderNumberDependencies,
): Promise<ResolveSenderNumberResult>
```

```ts
async upsertThread(
  input: UpsertConnectShyftThreadInput,
): Promise<ConnectShyftThread>
```

```ts
async listMappings(tenantId: string, orgUnitId: string): Promise<ConnectShyftNumberMapping[]>
```

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
+ ALTER TABLE connectshyft.cs_threads ADD COLUMN last_inbound_provider_number_e164 TEXT;
+ ALTER TABLE connectshyft.cs_threads ADD COLUMN preferred_outbound_provider_number_e164 TEXT;
+ ALTER TABLE connectshyft.cs_threads ADD CONSTRAINT cs_threads_last_inbound_provider_number_e164_ck CHECK (last_inbound_provider_number_e164 IS NULL OR last_inbound_provider_number_e164 ~ '^\+[1-9][0-9]{1,14}$');
+ ALTER TABLE connectshyft.cs_threads ADD CONSTRAINT cs_threads_preferred_outbound_provider_number_e164_ck CHECK (preferred_outbound_provider_number_e164 IS NULL OR preferred_outbound_provider_number_e164 ~ '^\+[1-9][0-9]{1,14}$');
```

```diff
-  preferredOutboundCsNumberId: normalizeString(input.thread?.preferredOutboundCsNumberId) || null,
-  lastInboundCsNumberId: normalizeString(input.thread?.lastInboundCsNumberId) || null,
+  preferredOutboundProviderNumberE164: normalizeString(input.thread?.preferredOutboundProviderNumberE164) || null,
+  lastInboundProviderNumberE164: normalizeString(input.thread?.lastInboundProviderNumberE164) || null,
```

```diff
+  const canonicalPreferredOutbound = normalizeE164OrNull(row.preferred_outbound_provider_number_e164);
+  const canonicalLastInbound = normalizeE164OrNull(row.last_inbound_provider_number_e164);
+  const compatibilityPreferredOutbound = normalizeThreadSenderAlignmentValue(row.preferred_outbound_cs_number_id);
+  const compatibilityLastInbound = normalizeThreadSenderAlignmentValue(row.last_inbound_cs_number_id);
```

```diff
+  preferred_outbound_provider_number_e164: preferredOutboundProviderNumberE164,
+  last_inbound_provider_number_e164: lastInboundProviderNumberE164,
```

## 4. REQUIRED CHANGES
1. Add canonical provider-number columns to `connectshyft.cs_threads`.
2. Backfill canonical columns:
   - direct-copy valid E.164 legacy values
   - map symbolic sentinels to the sole active orgUnit mapping number when deterministic
   - otherwise leave canonical column null
3. Update thread read model to expose:
   - `lastInboundProviderNumberE164`
   - `preferredOutboundProviderNumberE164`
4. Update thread writes to populate canonical fields and stop using symbolic sentinels as authoritative runtime values.
5. Update sender resolver to:
   - use canonical fields first
   - treat legacy fields only as compatibility input during migration
   - resolve active mapping by canonical provider number

## 5. DATA MUTATIONS
- `ALTER TABLE connectshyft.cs_threads ADD COLUMN last_inbound_provider_number_e164 TEXT`
- `ALTER TABLE connectshyft.cs_threads ADD COLUMN preferred_outbound_provider_number_e164 TEXT`
- `UPDATE connectshyft.cs_threads SET last_inbound_provider_number_e164 = ...`
- `UPDATE connectshyft.cs_threads SET preferred_outbound_provider_number_e164 = ...`
- reads from `connectshyft.cs_number_mappings (tenant_id, org_unit_id, twilio_number_e164, is_active)`

## 6. GUARDS (MANDATORY)
- Do not overwrite non-null canonical fields during backfill.
- Only convert a symbolic sentinel when exactly one active orgUnit mapping exists.
- Reject non-E.164 canonical writes.
- Legacy fields remain readable during migration but must not become authoritative after canonical value exists.

## 7. STOP CONDITION (VERIFIABLE)
At least one SQL query must pass:

```sql
select id, last_inbound_provider_number_e164, preferred_outbound_provider_number_e164
from connectshyft.cs_threads
where id = 'f3fe1191-f90a-4c7d-82ef-f77ce5dff8ba';
```

Expected:
- both canonical provider-number fields are populated with `+12602794044`

And one test must pass:
- sender resolver test proving symbolic legacy thread values are backfilled/cut over to canonical provider numbers deterministically

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "refactor(connectshyft): canonicalize thread sender alignment to provider numbers"
```

## 9. PROHIBITED
- No permanent alias fallback from symbolic sentinel to active mapping in runtime logic
- No new writes that persist `cs-number-*` as canonical sender alignment
