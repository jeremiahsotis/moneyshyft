# ConnectShyft Handlers

## Purpose

This folder holds route-family application handlers for ConnectShyft.

Slice 4 establishes the first extracted family:

- `/settings/navigation`
- `/availability`
- `/context`
- `/inbox`

Handlers exist to keep `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` thin without pushing HTTP concerns down into domain modules.

## Handler ownership

Handlers own:

- request-shape normalization that is local to one route family
- calling `http/accessContext.ts` for access, tenant, orgUnit, and actor context work
- orchestration across existing ConnectShyft modules
- response and refusal mapping for the route family

Handlers should stay small and explicit. They are an application boundary, not a second domain layer.

## What belongs in handlers

Put these concerns here when extracting future route families:

- route-family-specific access checks built on shared helper primitives
- route-family-level branching between read models or services
- response envelope payload assembly
- narrow HTTP-specific decisions that should not leak into service modules

## What stays in the router

The router should own only:

- route registration
- route path stability
- route ordering where Express matching depends on it
- shared middleware wiring that already belongs at the router boundary

The router should not regain inline business logic for extracted families.

## What stays in domain and service modules

Keep the following outside handlers:

- thread lifecycle rules
- inbox and read-model contracts
- neighbor and identity behavior
- escalation configuration behavior
- provider registry behavior
- canonical event and timeline behavior
- sender-number and dispatch policy behavior
- persistence details and data access rules

If logic would still make sense without Express, it likely belongs below the handler layer.

## Deferred scope

Outbound, webhook, and telephony extraction is explicitly deferred in Slice 4.

Do not use this folder as a dumping ground for:

- outbound call or message dispatch rewrites
- inbound SMS or voice rewrites
- webhook/provider orchestration rewrites
- bridge-session orchestration moves
- broad RBAC or tenancy cleanup

Those surfaces should stay in their current modules until a later route-family slice extracts them deliberately.

## Future extraction guardrail

When adding a new handler family:

1. characterize current route behavior first
2. add or extend shared access/context helpers only for the extracted-family need
3. move one route family at a time
4. keep deferred transport and provider concerns out unless that slice is explicitly about them
