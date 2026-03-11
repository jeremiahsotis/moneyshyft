# Canonical Event Schema

Comms Core emits canonical events for calls and messages. Each event record is persisted in the `events` table and optionally
sent to subscribers (internal services or external systems). An event has the following common fields:

| Field           | Type      | Description                                                                              |
|-----------------|-----------|------------------------------------------------------------------------------------------|
| `id`            | UUID      | Unique identifier for the event                                                          |
| `eventType`     | string    | Type of event (e.g., `CallAttemptStarted`)                                              |
| `aggregateId`   | UUID      | Identifier of the aggregate the event pertains to (callAttemptId, messageId, etc.)      |
| `aggregateType` | string    | Type of aggregate (`CallAttempt`, `Message`)                                             |
| `payload`       | JSON      | Event-specific details                                                                   |
| `createdAt`     | date-time | UTC timestamp when the event occurred                                                    |

## Event Types

### CallAttemptStarted
Indicates that an outbound call attempt has been initiated. The event occurs when `POST /calls/outbound` is called and the
call attempt is saved.

Payload:
- `conferenceId` (UUID) - the conference this call belongs to
- `fromNumber` (string) - the number used as caller ID
- `toNumber` (string) - destination phone number
- `metadata` (object) - any metadata passed by the caller

### CallLegCreated
Emitted when a provider leg is created (e.g., Telnyx call leg). Contains:
- `callAttemptId` (UUID)
- `providerName` (string, e.g., `telnyx`)
- `providerLegId` (string) - Telnyx call UUID

### CallRinging
Emitted when the call is ringing on the destination side. Contains:
- `callAttemptId` (UUID)

### CallConnected
Indicates that the call has been answered. Contains:
- `callAttemptId` (UUID)
- `answerTimestamp` (date-time)

### CallEnded
Emitted when the call finishes (hung up, timed out, or failed). Contains:
- `callAttemptId` (UUID)
- `hangupCause` (string) - reason from provider
- `durationSeconds` (integer)

### MessageQueued
Indicates that an outbound message has been enqueued. Contains:
- `messageId` (UUID)
- `conferenceId` (UUID)
- `fromNumber` (string)
- `toNumber` (string)

### MessageSent
Emitted when the provider accepts the message. Contains:
- `messageId` (UUID)
- `providerName` (string)
- `providerMessageId` (string)

### MessageDelivered
Provider reports that the message was delivered. Contains:
- `messageId` (UUID)
- `providerName` (string)
- `providerMessageId` (string)
- `deliveredTimestamp` (date-time)

### MessageFailed
Message delivery failed. Contains:
- `messageId` (UUID)
- `errorCode` (string)
- `errorDescription` (string)

## Extensibility

The event schema is versioned implicitly by the `eventType` string. When adding new events or additional payload fields
in the future (e.g., support for translation or multiple providers), ensure that new consumers handle unknown fields gracefully.
