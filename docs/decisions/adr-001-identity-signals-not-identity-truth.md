# ADR-001: Identity signals are not identity truth

## Status
Accepted

## Decision

Phone numbers, emails, addresses, and similar values are identity signals, not identity truth.

## Why

Real-world service work includes:
- shared phones
- shared emails
- unstable housing
- recycled phone numbers
- partial information
- identity ambiguity

Treating one signal as one person would create systematic data corruption.

## Consequences

- ContactPoint is first-class
- identity confidence must be explainable
- ambiguity must be surfaced, not hidden
- conversations must survive identity correction
