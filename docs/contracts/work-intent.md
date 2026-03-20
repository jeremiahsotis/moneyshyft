# Contract: WorkIntent

## Purpose

WorkIntent is a lightweight capture-and-handoff object.

It exists so users can mark that something needs attention before CaseShyft is fully in place.

## Design intent

WorkIntent is:
- structured
- lightweight
- transitional

WorkIntent is not:
- full case management
- a task engine
- a durable workflow domain

## Typical intent types

Examples already discussed include:
- needs_follow_up
- needs_assistance
- needs_case_review
- needs_identity_review
- needs_program_follow_up
- needs_callback

## Current platform rule

ConnectShyft may create WorkIntent now, but CaseShyft should become the primary long-term operational workspace later.

That means WorkIntent should stay intentionally small and not grow into a parallel work system.
