# PeopleCore Identity Hooks

This note locks the narrow Checkpoint 5 hook foundation behind the ConnectShyft seam.

Current invocation points:
- inbound subject resolution enables provisional-person creation on seam-level `no_match`
- inbound subject resolution enables resolver-review creation on seam-level `IDENTITY_MATCH_AMBIGUOUS`
- the neighbor identity-match handler enables resolver-review creation on seam-level `IDENTITY_MATCH_AMBIGUOUS`

Current non-goals:
- ConnectShyft neighbor creation still owns the external create flow
- route envelopes do not change when hook writes succeed or fail
- PeopleCore hook failures are intentionally best-effort and non-blocking

Deferred for later slices:
- replacing ConnectShyft neighbor creation with PeopleCore person creation
- broad dual-write across neighbor create, update, merge, or delete flows
- rebinding threads or conversations directly to PeopleCore persons
