# Engineering Task Breakdown (V1 Implementation)

This document outlines the tasks required to implement the V1 Comms Core using Telnyx as the primary provider. The
design is provider-agnostic and anticipates translation features and multi-provider routing in future versions.

## 1. Project Setup

1. **Repository initialization**: Create a new service repository (or module within existing backend) for Comms Core.
2. **Dependency management**: Install HTTP framework (e.g., FastAPI, Express.js), database driver (e.g., SQLAlchemy or TypeORM), and Telnyx SDK.
3. **Environment configuration**: Set up environment variables for Telnyx API keys, webhook secret, database URL, etc.

## 2. Database Migration

1. **Define schema**: Implement the SQL schema described in `db_schema.sql` using migrations (e.g., Alembic or Liquibase). This includes tables for users, tenants, call attempts, provider legs, messages, provider message IDs, conferences, on-call schedules, ring groups, inbound routing, and events.
2. **Run migrations**: Apply migrations to development and staging databases.

## 3. Core Models and Repository Layer

1. **Data models**: Implement ORM models corresponding to the tables. Provide repository methods to create and update call attempts, messages, provider leg mappings, and event records.
2. **Event store**: Provide methods for appending canonical events to the `events` table and querying events by aggregate ID.
3. **Routing logic**: Implement logic to determine the claimant for inbound calls/messages based on `conference.claimant_routing` (CLAIMANT, ON_CALL_USER, RING_GROUP). Use on-call schedule and ring group membership tables as appropriate.

## 4. Provider Adapter Layer

1. **Define adapter interface**: Use the interface described in `provider_adapter.md`.
2. **Implement Telnyx adapter**:
   - Use Telnyx Call Control API to create outbound calls. Include `call_attempt_id` in `custom_data`.
   - Use Telnyx Messaging API to send SMS/MMS messages. Include `message_id` in client state (metadata).
   - Verify webhook signatures and parse events. Map Telnyx event types to canonical events (e.g., `call.answered` -> `CallConnected`).
   - Persist provider leg and message ID mappings for redundancy.
3. **Error handling**: Map provider errors to canonical events `CallEnded` or `MessageFailed` with appropriate codes.

## 5. API Layer

1. **Define OpenAPI contract**: Implement endpoints described in `openapi.yaml` using your chosen framework.
2. **Outbound call endpoint** (`POST /calls/outbound`):
   - Validate input and create a new `call_attempt` record.
   - Generate canonical event `CallAttemptStarted`.
   - Invoke the adapter `createOutboundCall`. Persist returned `provider_leg_id`.
3. **Outbound message endpoint** (`POST /messages/outbound`):
   - Validate input and create a new `message` record.
   - Generate canonical event `MessageQueued`.
   - Invoke the adapter `sendOutboundMessage`. Persist `provider_message_id`.
4. **Telnyx webhook endpoint** (`POST /provider/telnyx/webhooks`):
   - Verify request signature using webhook secret.
   - Pass the payload to the adapter `handleWebhook` to produce canonical events.
   - Persist canonical events and update call/message status.
5. **Status endpoints**: Expose `GET /status/call/{callAttemptId}` and `GET /status/message/{messageId}` to return the current status and provider IDs.
6. **Events endpoint**: Implement streaming or paginated retrieval of events for debugging or downstream consumers.

## 6. Inbound Routing and Bridge Calls

1. **Inbound number mapping**: Use `inbound_routing_rules` to map inbound numbers to conferences. Provide an API or admin UI to configure these rules.
2. **Routing decision service**: Each time Comms Core receives an inbound call or message, query ConnectShyft to decide the claimant (CLAIMANT, ON_CALL_USER, or RING_GROUP) based on conference settings and schedule. For V1, Comms Core is stateless and requests routing decisions via API.
3. **Bridge call logic**: When connecting the neighbor to the claimant, handle the call via Telnyx call control (create second leg and bridge). Use `call_attempt_id` metadata to correlate legs. When translation is added in future versions, insert translation service in the media path.

## 7. Hardening and Failures

1. **Metadata correlation**: Embed `call_attempt_id` in Telnyx `custom_data`. Fallback: persist provider leg ID mapping and lookups.
2. **Retry strategy**: Implement retries for call creation and message sending. Use exponential backoff and deduplicate events.
3. **Security**: Enforce IP whitelisting or header checking for webhooks. Validate all inputs and avoid SQL injection.
4. **Monitoring and logging**: Instrument API endpoints and adapter operations. Publish metrics (latency, error rates, call durations) and logs.

## 8. Testing

1. **Unit tests**: Mock Telnyx adapter to test API logic, routing decisions, and event generation.
2. **Integration tests**: Use Telnyx sandbox credentials to simulate call flows and webhook events.
3. **Load tests**: Validate that the service can handle the expected volume of calls and messages.

## 9. Deployment

1. **CI/CD pipelines**: Build and deploy the service to staging and production environments. Run database migrations automatically.
2. **Infrastructure**: Ensure inbound webhooks and outbound calls operate from a stable IP range. Use secure secret management.

## 10. Future Features (Plan Only)

1. **Multi-provider routing**: Abstraction layer is in place. Add provider selection based on conference or failover logic.
2. **Translation service**: Insert translation layer into call bridging. Extend event schema to include translated text.
3. **Internationalization**: Support additional languages and timezones.
4. **Enhanced analytics**: Add more granular call quality metrics and user feedback.
