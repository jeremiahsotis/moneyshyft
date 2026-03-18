# PR 022 — Implementation Notes

## Raw Body Middleware

app.use(express.json({
verify: (req, \_res, buf) => {
(req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
},
}));

---

## Resolver Usage (Critical Block)

Insert into inbound SMS flow:

if (!neighborId) {
const senderPhone = extractSenderPhone(req.body);

const result = await resolveSubjectByContactPoint({
tenantId,
orgUnitId,
contactPoint: senderPhone,
});

if (result.type === ‘single’) {
neighborId = result.neighborId;
}

else if (result.type === ‘none’) {
neighborId = await createNeighborFromInbound({
tenantId,
orgUnitId,
phone: senderPhone,
});
}

else {
return refusal(…AMBIGUOUS…);
}
}

---

## Prefers Texting Logic

if (isInboundSms) {
if (neighbor.prefers_texting === ‘UNKNOWN’) {
updatePrefersTexting(neighborId, ‘YES’);
}
}

---

## Important

- DO NOT query DB directly in route
- ALWAYS go through resolver
- ALWAYS normalize phone before lookup
