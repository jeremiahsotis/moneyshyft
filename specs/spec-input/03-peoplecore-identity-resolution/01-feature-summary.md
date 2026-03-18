# PeopleCore + Identity Resolution — Feature Summary

## What is being built

PeopleCore + Identity Resolution provides the foundational subject model for the ShyftUnity platform.

This feature introduces and formalizes:

- person records
- household records
- address records
- relationship records
- household membership
- tenant-scoped person identity
- platform-level identity clustering
- alias and external identifier support
- duplicate detection and merge review workflows

This is the foundation that lets all other modules reliably know who a person is, what household they belong to, and how to reference them without creating dangerous duplication or cross-tenant leakage.

## Why now

After the shell foundation, this is the most important enabling layer for the rest of the platform.

ConnectShyft triage, CaseShyft, Documents, Evidence, Eligibility, Referrals, and ProgramShyft all depend on stable subject identity.

Without PeopleCore and Identity Resolution:
- communications cannot be attached reliably
- cases cannot be created safely
- households cannot be modeled well
- duplicate people will proliferate
- cross-tenant coordination will be unsafe or confusing

## Who uses this

Direct users:
- intake staff
- case managers
- program managers
- supervisors
- data quality / admin staff

Indirect users:
- ConnectShyft triage
- CaseShyft
- ProgramShyft
- Document + Evidence
- Eligibility
- Referral workflows

## Success definition

A staff user should be able to:

1. create and update person records
2. create and manage households
3. manage addresses and relationships
4. identify likely duplicate records
5. review and confirm or reject identity matches
6. safely preserve tenant-scoped records while linking them through platform identity clusters