# Workflow Context

## A. Document request workflow

1. staff determines that a document is needed
2. staff creates a document request
3. request is linked to a person, household, case, program, or screening context
4. secure upload link is sent to the participant
5. request remains open until completed, expired, or canceled

## B. Participant upload workflow

1. participant receives secure link
2. participant uploads file or photo
3. upload is attached to the document request if applicable
4. document record and document version are created
5. document enters verification queue

## C. Worker direct upload workflow

1. staff uploads document directly from case/program/intake context
2. document record is created
3. verification is pending until reviewed

## D. Verification workflow

1. reviewer opens document
2. reviewer evaluates whether it is acceptable
3. reviewer marks:
   - verified
   - rejected
   - needs replacement
4. verification result is stored and auditable

## E. Evidence creation workflow

1. staff or downstream workflow identifies a fact that should be stored as reusable evidence
2. evidence record is created or updated
3. evidence may be linked to one or more documents
4. verification history is stored

## F. Evidence reuse workflow

1. later workflow needs a fact, such as monthly income or county of residence
2. system checks for existing evidence
3. evidence is shown as:
   - reusable
   - needs confirmation
   - stale
   - missing
4. worker confirms unchanged or updates it
5. usage event is recorded

## G. Case-linked document/evidence workflow

1. case worker requests or uploads document
2. document is linked to case context
3. evidence supported by that document becomes available for later case or screening use

## H. Future referral bundle workflow

1. approved documents are grouped into a bundle reference
2. later referral flow may use that bundle under scoped access rules