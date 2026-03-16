# Acceptance Criteria

## PeopleCore

- person records can be created, updated, and queried
- household records can be created and queried
- people can be linked to households
- addresses can be added and queried
- relationships can be created and queried

## Identity Resolution

- identity clusters can exist independently of tenant visibility
- aliases can be stored and queried
- duplicate candidates can be generated
- reviewer can confirm or reject match candidates
- cluster linkage changes are auditable
- unmerge / linkage removal path is supported safely

## Safety

- tenant-scoped person identity is preserved
- identity linkage does not expose cross-tenant data
- downstream systems can store stable references to person and household records
- ConnectShyft-style lookup can be supported by the model

## Auditability

- creation, linkage, review, and merge-related actions are recorded

## Extraction readiness

- PeopleCore and Identity Resolution boundaries are explicit enough to separate later if needed