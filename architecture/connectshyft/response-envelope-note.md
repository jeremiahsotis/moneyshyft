# Response Envelope Note

The ConnectShyft API may respond with:

- HTTP 200
- JSON payload with `ok: false`

`fetchResponse.ok` checks HTTP success only.

Correct interpretation:

1. parse payload
2. inspect payload.ok
3. if `ok === false`, treat as refusal
4. only treat as success when payload semantics support success
