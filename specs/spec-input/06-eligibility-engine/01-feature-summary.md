# Eligibility Engine — Feature Summary

## What is being built

The Eligibility Engine provides the shared screening capability for ShyftUnity.

This feature introduces and formalizes:

- eligibility policies
- policy requirements
- evidence and document requirements
- screening requests
- screening results
- explanation payloads
- missing-information detection
- override controls
- result history and validity tracking

The Eligibility Engine allows staff to determine whether a person, household, program participant, or other screening subject is likely eligible, clearly ineligible, missing information, or requires manual review.

## Why now

After Documents + Evidence, the next operational need is consistent eligibility screening.

Without this layer:
- screening remains manual and inconsistent
- staff must interpret rules ad hoc
- service matching is weak
- program enrollment logic is unclear
- referral readiness is harder to assess

The Eligibility Engine turns verified information into usable eligibility decisions without duplicating the document and evidence layer.

## Who uses this

Primary users:
- intake staff
- case managers
- program managers
- supervisors
- eligibility reviewers

Secondary users:
- ResourceShyft workflows
- ProgramShyft enrollment flows
- future referral workflows
- future self-service experiences

## Success definition

A staff user should be able to:

1. run a screening against an eligibility policy
2. see whether the subject is eligible, ineligible, missing information, potentially eligible, or needs manual review
3. understand why the result occurred
4. see what information is missing or stale
5. use reusable evidence and linked documents rather than re-collecting information
6. record overrides where allowed