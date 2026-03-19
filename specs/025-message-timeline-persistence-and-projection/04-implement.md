# PR 025 — Implementation Notes

## Projection Function

function getThreadTimeline(input) {
const events = loadCanonicalEvents(input);

return events
.map(mapEventToTimelineItem)
.sort((a, b) => {
if (a.occurred_at_utc === b.occurred_at_utc) {
return a.id.localeCompare(b.id);
}
return a.occurred_at_utc - b.occurred_at_utc;
});
}

---

## Mapping Example

function mapEventToTimelineItem(event) {
if (event.type === ‘inboundSmsAppended’) {
return {
id: event.id,
direction: ‘inbound’,
channel: ‘sms’,
body: event.payload.message,
occurred_at_utc: event.occurredAt,
};
}
}

---

## Important

- DO NOT mutate canonical events
- DO NOT store timeline separately
