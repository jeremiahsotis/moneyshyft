# Provider Adapter Interface

The provider adapter isolates the Comms Core from provider-specific APIs. Telnyx is the primary provider for V1
but the interface supports multiple providers via a consistent set of operations.

Each adapter implements the following interface (in pseudo-code):

```typescript
interface ProviderAdapter {
  /**
   * Initiate an outbound call. Creates a call leg via the provider and returns
   * a provider leg identifier. The callAttemptId is supplied to the provider as
   * metadata (using call_control_id or custom_data field) so that Telnyx will
   * include it in subsequent webhook events.
   */
  createOutboundCall(request: {
    callAttemptId: UUID
    fromNumber: string
    toNumber: string
    metadata: Record<string, any>
  }): Promise<{ providerLegId: string }>

  /**
   * Send an outbound SMS/MMS message. The implementation should include
   * messageId in provider metadata for correlation.
   */
  sendOutboundMessage(request: {
    messageId: UUID
    fromNumber: string
    toNumber: string
    body: string
    mediaUrl?: string
  }): Promise<{ providerMessageId: string }>

  /**
   * Handle inbound webhook events from the provider. This method
   * should verify signatures, parse the payload, extract the callAttemptId
   * from metadata (for call events) or messageId (for message events),
   * and translate provider events into canonical events.
   */
  handleWebhook(rawPayload: any, headers: Record<string, string>): Promise<CanonicalEvent[]>

  /**
   * Convert a Telnyx event into one or more canonical events. Useful for tests and
   * debugging, but not typically called directly by higher layers.
   */
  toCanonicalEvents(providerEvent: any): CanonicalEvent[]
}

interface CanonicalEvent {
  id: UUID
  eventType: string
  aggregateId: UUID
  aggregateType: 'CallAttempt' | 'Message'
  payload: Record<string, any>
  createdAt: string
}
```

### Telnyx Adapter Notes

- **Outbound calls**: Use Telnyx Call Control API to create a call. Set `custom_data` to include
  `call_attempt_id` so that Telnyx will echo it back in webhook events. The response
  includes a `call_control_id` (providerLegId) which we persist in `provider_legs`.

- **Webhooks**: Telnyx sends events like `call.initiated`, `call.answered`, `call.hangup`, `message.received`, and
  `message.delivery_update`. The adapter must verify the Telnyx signature header and then inspect
  `data.payload.custom_data` or `data.payload.client_state` to extract our `call_attempt_id` or `message_id`.

- **Defensive redundancy**: In addition to metadata correlation, the adapter should also store the mapping from
  `call_control_id` to `call_attempt_id` and from `message_uuid` to `message_id` in the database (tables
  `provider_legs` and `provider_message_ids`) to handle cases where metadata is lost.

- **Error handling**: Provider errors should be mapped to canonical events such as `CallEnded` with appropriate
  hangup cause or `MessageFailed` with an error code.

### Extending with Additional Providers

To support new providers (e.g., Plivo or Bandwidth), implement the same interface using the provider's API.
Providers may require different parameters (e.g., API keys, endpoints). The adapter layer should contain
provider-specific configuration and keep the rest of the Comms Core unaware of the differences.
