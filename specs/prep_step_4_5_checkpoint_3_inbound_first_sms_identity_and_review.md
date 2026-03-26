# CHECKPOINT 3 — INBOUND-FIRST SMS ENSURE/CREATE + RESOLVER REVIEW CREATION

## 1. FILES (Exact Paths)
- `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
- `apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- relevant inbound webhook tests

## 2. FUNCTION SIGNATURES (Exact)
```ts
async resolveInboundWebhookCorrelation(input: ResolveInboundWebhookCorrelationInput): Promise<ResolveInboundWebhookCorrelationResult>
```

```ts
async createProvisionalPersonHook(input: ConnectShyftProvisionalIdentityHookInput): Promise<ConnectShyftProvisionalIdentityHookResult>
```

```ts
async createResolverReviewHook(input: ConnectShyftResolverReviewHookInput): Promise<ConnectShyftResolverReviewHookResult>
```

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)
```diff
- if (!neighborId) {
-   await markWebhookReceipt('FAILED_TERMINAL', 'neighbor_unresolved');
-   refusal(...CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED...);
-   return;
- }
+ if (!neighborId) {
+   const identityResolution = await peopleCoreIdentityAdapter.evaluateIdentityCandidatesForContactPoint({
+     tenantId,
+     contactPointValue: normalizedSenderPhone,
+   });
+   // zero candidates -> provisional
+   // one candidate -> resolved person
+   // multiple candidates -> resolver review + ambiguity event
+ }
```

## 4. REQUIRED CHANGES
- Allow destination-number mapping correlation to proceed without prior thread id.
- Remove early `neighbor_unresolved` refusal.
- Create provisional person/contact point/link when zero candidates exist.
- Create resolver review + ambiguity event when ambiguous.
- Ensure thread using resolved/created `personId`.
- Persist canonical event after ensure succeeds.

## 5. DATA MUTATIONS
Possible writes:
- `people.contact_points`
- `people.contact_point_links`
- `people.persons`
- `people.resolver_reviews`
- `connectshyft.cs_identity_ambiguity_events`
- `connectshyft.cs_threads`
- `connectshyft.cs_webhook_receipts`

## 6. GUARDS (MANDATORY)
- Number-mapping-only correlation is sufficient to continue.
- Ambiguous identity must not silently pick a person.
- Provisional creation and review creation remain duplicate-safe.

## 7. STOP CONDITION (VERIFIABLE)
- Inbound-first SMS integration test creates provisional person/thread when no match exists and resolver review when ambiguous.

## 8. COMMIT POINT (MANDATORY)
```bash
git add .
git commit -m "fix(connectshyft): allow inbound-first sms to create provisional identity and review work"
```

## 9. PROHIBITED
- No requirement for prior outbound correlation metadata.
