# CS-005 Minimal Internal Event Model Note

Provider-native names must not become internal event language above infrastructure.

Minimum internal events:
- outbound_sms_requested
- outbound_sms_accepted
- outbound_sms_failed
- outbound_call_requested
- outbound_call_accepted
- outbound_call_failed
- bridge_session_requested
- bridge_session_created
- bridge_session_failed
- operator_call_created
- neighbor_call_created
- operator_answered
- neighbor_answered
- bridge_connected
- bridge_failed
- call_completed
- idempotency_duplicate_returned
- idempotency_conflict_rejected
- webhook_received
- webhook_duplicate_ignored
- webhook_processed
- webhook_failed
- retry_scheduled
- retry_exhausted

Audit-facing result states:
- succeeded
- failed
- ignored_duplicate
- retrying
- exhausted
