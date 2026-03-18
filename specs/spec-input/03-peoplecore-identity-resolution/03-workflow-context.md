# Workflow Context

## A. Create person workflow

1. staff creates a new person record
2. required identifying information is entered
3. system checks for likely duplicates
4. if no likely duplicate is accepted, person is created
5. person is linked to current tenant context

## B. Create household workflow

1. staff creates a household
2. one or more people are linked as household members
3. address may be attached to household
4. household membership and relationship roles are stored

## C. Address workflow

1. staff adds address to person or household
2. address may become current or historical
3. address is normalized and stored
4. future workflows can query current address safely

## D. Relationship workflow

1. staff links two people with a relationship
2. relationship type is chosen
3. relationship becomes queryable in intake/case/program context

Examples:
- guardian_of
- dependent_of
- spouse_or_partner_of
- household_member_of

## E. Duplicate review workflow

1. system generates likely duplicate match candidate
2. reviewer sees the competing records
3. reviewer chooses:
   - confirm match
   - reject match
   - defer review
4. if confirmed, person remains tenant-scoped but links to a shared identity cluster

## F. Merge / unmerge linkage workflow

1. reviewer confirms identity linkage
2. identity cluster membership is updated
3. audit trail is recorded
4. if needed later, linkage can be reversed safely

## G. ConnectShyft lookup workflow

1. intake staff receives communication
2. searches person/household by phone, email, name, or address
3. system returns likely matches
4. worker links existing record or creates a new one

## H. Case / Program linkage workflow

1. case or program flow needs a subject
2. person or household is selected
3. downstream workflow stores stable reference to tenant-scoped subject