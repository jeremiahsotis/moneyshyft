# ADR-003: ConnectShyft is standalone now and embedded later

## Status
Accepted

## Decision

ConnectShyft should function as a standalone communication workspace early, but its long-term primary user experience should be as an embedded communication surface inside CaseShyft.

## Why

The platform needs usable communication tooling now, but should avoid building a second long-term case system.

## Consequences

- ConnectShyft owns communications domain behavior
- CaseShyft should later become the primary operational workspace
- ConnectShyft components and APIs should be embeddable from the beginning
