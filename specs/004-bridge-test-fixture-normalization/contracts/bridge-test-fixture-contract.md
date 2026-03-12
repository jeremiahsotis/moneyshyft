# Contract: CS-004b Normalized Bridge Test Fixtures

## Purpose

Define the allowed fixture shapes for bridge-related tests so app-layer and bridge-domain coverage remains provider-neutral after CS-003a remediation.

## In-Scope Test Surfaces

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`

## Required Normalized Fields

Bridge-facing tests must prefer these names:

- `providerLegId`
- `providerMessageId`
- `providerEventId`
- `providerNumber`
- `providerCallId` where the underlying test surface expects call-level identifiers

## Required Fixture Naming

Where the provider itself is not the behavior under test, fixture values should use neutral identifiers such as:

- `provider-leg-operator-*`
- `provider-leg-neighbor-*`
- `provider-message-*`
- `provider-event-*`
- `provider-a`
- `provider-b`

Where provider selection is required by the route or mapping surface, a concrete supported provider key may still appear in request setup, but bridge-facing fixture identifiers and correlation fields must remain neutral.

## Disallowed In Bridge/App Test Fixtures

- Vendor-prefixed field names such as `telnyxCallControlId`, `telnyxMessageId`, or `telnyxEventId`
- Legacy snake_case correlation keys in bridge-facing app tests when normalized camelCase fields can be used instead
- Direct Telnyx module mocking
- Vendor-labeled fixture identifier values when the provider itself is not under test

## Allowed Exception

Provider-native payloads and headers may remain only in infrastructure translation or webhook-signature tests and helpers where provider translation or signature verification is the explicit behavior under test.

Allowed exception surface for CS-004b:

- `tests/support/helpers/connectShyftWebhookTestHelpers.ts`

## Runtime Contract

This contract does not change runtime behavior. It only constrains the naming and shape of bridge-related test fixtures so they reflect the existing provider-neutral runtime contract.
