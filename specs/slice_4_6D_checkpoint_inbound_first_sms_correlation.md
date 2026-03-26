# Slice 4.6D Checkpoint — Inbound-First SMS Correlation Rewrite

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectWebhookSms.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.inboundWebhookContext.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`

## 2. FUNCTION SIGNATURES (Exact)
```ts
export const resolveInboundWebhookCorrelation = async (
  input: ResolveInboundWebhookCorrelationInput,
): Promise<ResolveInboundWebhookCorrelationResult>
```

```ts
export const postConnectWebhookSms = async (req: Request, res: Response) =>
  executeConnectShyftInboundWebhookRoute(req, res, 'sms');
```

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
-  if (!fallback.ok && providerNumberE164) {
+  if (!fallback.ok && providerNumberE164) {
     try {
       const numberMapping = await connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber({
         tenantId: numberMappingTenantScope,
         twilioNumberE164: providerNumberE164,
       });
       if (numberMapping.status === 'found') {
         return {
           ok: true,
           source: 'number_mapping',
           tenantId: numberMapping.mapping.tenantId,
           orgUnitId: numberMapping.mapping.orgUnitId,
           threadId: '',
           providerLegId: providerIdentifiers.providerLegId,
           providerMessageId: providerIdentifiers.providerMessageId,
           providerEventId: providerIdentifiers.providerEventId,
+          providerNumberE164,
         };
       }
```

```diff
-      remediation: 'Retry with thread metadata or provider identifiers that map to a prior outbound dispatch.',
+      remediation: 'Retry with valid signing and a mapped inbound provider number or prior thread metadata.',
```

```diff
+  const isInboundSmsRoute = input.channelHint === 'sms';
+  if (!fallback.ok && isInboundSmsRoute && providerNumberE164 && numberMapping.status === 'found') {
+    // continue via number_mapping correlation
+  }
```

## 4. REQUIRED CHANGES
1. Preserve metadata-first and provider-id-first precedence.
2. Permit inbound SMS correlation success on mapped inbound provider number when metadata and provider-id lookup do not resolve a thread.
3. Preserve empty `threadId` on number-mapping correlation so downstream ensure flow can create/reuse thread.
4. Keep refusal envelope shape stable for true unmapped/unavailable cases.
5. Update characterization tests to assert mapped first-contact inbound SMS no longer returns identifiers-required refusal.

## 5. DATA MUTATIONS
Reads only inside correlation:
- provider identifiers from webhook payload
- number mapping resolution by inbound provider number

No domain writes allowed in correlation resolver.

## 6. GUARDS (MANDATORY)
- Do not bypass metadata/provider-id precedence.
- Apply number-mapping fallback only for inbound SMS route kind / channel hint.
- Do not create threads or PeopleCore entities inside correlation resolver.
- Preserve refusal for truly unmapped inbound provider numbers.

## 7. STOP CONDITION (VERIFIABLE)
One characterization test or real webhook replay must stop returning:
- `CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED`

for Telnyx inbound SMS to mapped provider number `+12602794044`.

Expected successful correlation payload:
- `source = 'number_mapping'`
- `tenantId = '942de4d9-3e9d-4ff9-98eb-b498fd4f496a'`
- `orgUnitId = '019d2e6d-3ea5-4b04-8722-4029e504b86e'`
- `threadId = ''`

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): allow inbound-first sms correlation by mapped provider number"
```

## 9. PROHIBITED
- No thread creation in correlation resolver
- No PeopleCore identity work in correlation resolver
- No voice-route behavior changes in this checkpoint
