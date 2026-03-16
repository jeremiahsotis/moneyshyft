# Workflow Context

## A. Run screening workflow

1. user selects a screening subject
2. user selects or is given an eligibility policy
3. engine evaluates current reusable evidence and document-backed support
4. engine returns result state
5. user sees result, explanation, and missing/stale items

## B. Missing information workflow

1. screening runs with incomplete information
2. result indicates missing information or needs confirmation
3. user sees which evidence/documents are missing or stale
4. user can request or collect that information
5. screening can be rerun

## C. Reuse evidence workflow

1. screening needs fact such as monthly income or county of residence
2. engine checks Shared Evidence
3. evidence is marked as:
   - reusable
   - needs confirmation
   - stale
   - missing
4. user confirms/update flow occurs outside or alongside screening
5. screening result updates after rerun

## D. Ineligible workflow

1. screening runs
2. result is clearly ineligible
3. user sees explanation of failed requirement(s)
4. no override allowed unless policy permits it

## E. Potentially eligible / manual review workflow

1. screening result is not final enough for auto-decision
2. result indicates potentially eligible or requires manual review
3. user can escalate or review with supervisor
4. final outcome may be recorded through override or manual disposition

## F. Override workflow

1. policy and permissions allow override
2. authorized user records override decision
3. reason is required
4. audit record is preserved
5. original screening result remains historically visible

## G. Future service/program/referral use workflow

1. ResourceShyft, ProgramShyft, or Referral flow requests screening
2. Eligibility returns structured result and explanation payload
3. consuming workflow decides next action using the result