# RouteShyft Monolith PRD

Version: 2026-02-17

## Vision

RouteShyft is district dispatch infrastructure implemented as a module
inside the Shyft monolith. The algorithm recommends only. Humans approve
all assignments.

## Scope V1

-   Public intake (unauthenticated + spam controls)
-   Availability + capacity enforcement
-   Dispatcher console
-   Driver workflow + immutable completion proof
-   Audit logging
-   Media subsystem (droplet storage)
-   Email notifications

## Non-Goals

-   Autonomous dispatch
-   Volunteer/HR system
-   SMS
-   External routing engines
