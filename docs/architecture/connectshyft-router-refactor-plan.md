# ConnectShyft Router Refactor Plan

## Purpose

This document describes the planned reduction of `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` from a multi-responsibility orchestration file into a thin router with route-family handlers.

This is not a rewrite for style. It is a controlled reduction of architectural risk.

## Current problem

`connectshyft.ts` currently owns too many concerns at once:

- route registration
- request parsing and validation
- route-specific authorization checks
- orgUnit/tenant context resolution
- orchestration across multiple ConnectShyft modules
- response shaping
- synthetic/test-oriented helper logic
- lifecycle coordination
- outbound/webhook/telephony coordination

This creates:
- high cognitive load
- drift risk between route and module logic
- difficulty isolating bugs
- difficulty safely integrating PeopleCore
- difficulty evolving ConnectShyft toward a simpler operator experience

## Refactor target

### Desired layering

#### 1. Router
Owns only:
- route registration
- wiring request to handler

The router should not contain substantive business logic.

#### 2. Application handlers
Own:
- request DTO normalization
- access/context resolution through explicit helper(s)
- orchestration across domain modules
- response mapping

#### 3. Domain and service modules
Own:
- thread behavior
- neighbor behavior
- identity behavior
- provider/webhook logic
- timeline assembly
- sender resolution
- escalation behavior

Over time, platform concerns should stop leaking sideways into domain modules where not necessary.

## Route-family extraction order

This is the intended order.

### Slice 4
First low-risk route family:
- `/settings/navigation`
- `/availability`
- `/context`
- `/inbox`

Reason:
- lower transport risk
- strong product relevance
- good place to establish handler and access-context patterns

### Later extraction order

#### 1. Thread read surface
- `/threads/:threadId`
- `/threads/:threadId/timeline`

Reason:
- timeline is product-critical
- read surfaces are easier to pin before action surfaces

#### 2. Thread lifecycle actions
- claim
- takeover
- close

Reason:
- directly tied to Inbox / My Conversations behavior

#### 3. Neighbor / identity bridge
- `/neighbors/*`
- identity match
- merge

Reason:
- should converge carefully with PeopleCore rather than being rewritten prematurely

#### 4. Outbound actions
- `/threads/:threadId/call`
- `/threads/:threadId/messages`

Reason:
- high orchestration complexity
- bridge call and sender logic
- idempotency, reliability, override rules

#### 5. Inbound/webhooks/telephony
- inbound SMS
- inbound voice
- voicemail/transcription
- provider correlation and webhook flows

Reason:
- highest complexity and coupling
- should be last, after router shape is already under control

## Product-critical behavior that must not be destabilized

These are the key behaviors to preserve while refactoring:

- one inbox per orgUnit, or tenant/user when orgUnit is absent
- My Conversations / claimed thread behavior
- claim thread behavior
- chronological thread timeline with real SMS/MMS/call/voicemail content and metadata
- outbound bridge-call behavior now, with room for future direct calling
- inbound routing by orgUnit rule
- 7-day inactive-thread forwarding policy
- PeopleCore-aware neighbor creation/editing
- minimal-clutter operator UX target

## Current architecture decisions this plan must respect

- conversation is anchored to ContactPoint + orgUnit, not Person
- identity signals are not identity truth
- ConnectShyft is the communications substrate
- CaseShyft should become the primary long-term workspace
- WorkIntent is lightweight and transitional
- PeopleCore should remain the source of truth for person-related identity structures

## What this plan does not do

This plan does not assume:
- a full rewrite
- microservice extraction
- a new framework
- a telephony redesign
- WebRTC/SIP implementation now

Thin router is the goal because it creates the safest product boundary, not because it is fashionable.

## Practical rule for future slices

Every ConnectShyft router slice should answer:

1. which route family is moving
2. what tests pin current behavior
3. what new handler boundary is introduced
4. what is explicitly deferred

If a slice cannot answer those four clearly, it is too broad.

## Suggested repo location

Place this file at:

`docs/architecture/connectshyft-router-refactor-plan.md`
