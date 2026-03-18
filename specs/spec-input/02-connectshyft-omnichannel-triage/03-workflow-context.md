# Workflow Context

## A. Inbound phone call workflow

1. call is received through telephony adapter
2. inbound communication record is created
3. intake staff sees the inbound call in triage
4. staff can search or create person/household
5. staff can:
   - create intake stub
   - create case
   - attach to existing case
   - notify / assign
6. final routing state is stored

## B. Inbound SMS / MMS workflow

1. message arrives
2. message is normalized into conversation/thread context
3. if unassigned, it appears in triage
4. staff links or routes it
5. future messages remain attached to the correct thread

## C. Inbound email workflow

1. email arrives through ingestion pipeline
2. email thread is created or matched
3. thread appears in triage if not already attached
4. staff links it to person/case/program or leaves in queue

## D. Webchat workflow

1. visitor opens chat
2. chat session begins
3. messages create or append to a chat conversation
4. if unresolved/unattached, chat lands in triage
5. staff can continue, assign, convert, or attach

## E. Website form workflow

1. user submits website form
2. submission is stored as structured inbound record
3. triage staff reviews submission payload
4. staff can:
   - create intake stub
   - create case
   - attach to person
   - route to program inquiry
   - create callback/follow-up task

## F. Person/household linkage workflow

1. triage worker searches by phone, email, name, or address
2. system shows likely person/household matches
3. worker selects existing match or creates new record
4. triage item is linked

## G. Case/program attach workflow

From triage, worker may:
- attach to existing case
- create new case
- attach to existing program
- create follow-up action for later program routing

## H. Notification/assignment workflow

1. triage item is assigned to user/team
2. target user receives notification
3. queue state updates
4. audit trail records the change