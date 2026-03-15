# Refusal Rendering Contract

Status: Governing contract

The ConnectShyft API may return HTTP 200 with a business refusal payload:

- `ok: false`
- `code`
- `message`
- optional details

The UI must treat that as refusal/failure, not success.

Rules:
1. Frontend success must not be determined by HTTP status alone.
2. If payload contains `ok: false`, the UI must enter refusal rendering.
3. Business refusals must remain distinct from transport/network failures.
4. Refusal message/code/details must be surfaced.
