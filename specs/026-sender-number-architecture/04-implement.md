# PR 026 — Implementation Notes

## Resolver

async function resolveSenderNumber(input) {
const mapping = await numberMappingService.resolveRoutingMappingByNumber({
tenantId: input.tenantId,
twilioNumberE164: input.providerNumberE164,
});

if (mapping.status !== ‘found’) {
throw new Error(‘sender_number_unresolved’);
}

return mapping.mapping.providerNumberE164;
}

---

## Important

- DO NOT fallback to threadId or neighborId
- DO NOT generate synthetic identifiers
