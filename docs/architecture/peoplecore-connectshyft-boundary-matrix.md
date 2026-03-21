# PeopleCore ConnectShyft Boundary Matrix

## Status

Authoritative for the Slice 13 ownership boundary.

`Rebind Class` is a future planning label. In Slice 13, it does not mean automatic PeopleCore-to-ConnectShyft linking, solved cross-system equivalence, or active reconciliation behavior.

| Object | Current Owner | Slice 13 Persistence Owner | Rebind Class | Current Note |
| --- | --- | --- | --- | --- |
| Person | PeopleCore | PeopleCore | auto_rebind | Persisted in `people.persons` |
| Household | PeopleCore | PeopleCore | review_rebind | Persisted in `people.households` |
| HouseholdMembership | PeopleCore | PeopleCore | review_rebind | Persisted in `people.household_memberships` |
| Address | PeopleCore (conceptual) | Deferred | review_rebind | Not yet persisted in Slice 12 |
| Relationship | PeopleCore (conceptual) | Deferred | review_rebind | Not yet persisted in Slice 12 |
| ContactPoint | PeopleCore | PeopleCore | auto_rebind | Persisted in `people.contact_points` |
| ContactPointLink | PeopleCore | PeopleCore | review_rebind | Persisted in `people.contact_point_links` |
| ContactPointEvent | PeopleCore | PeopleCore | historical_only | Persisted in `people.contact_point_events` |
| ResolverReview | PeopleCore | PeopleCore | historical_only | Persisted in `people.resolver_reviews` |
| ConnectShyftNeighbor | ConnectShyft | ConnectShyft | review_rebind | Still owns current external neighbor API and lifecycle |
| Conversation / Thread | ConnectShyft | ConnectShyft | auto_rebind | Still anchored to contact-point plus orgUnit, not directly to Person |
| Message | ConnectShyft | ConnectShyft | historical_only | No ownership change in Slice 12 |
| DeliveryAttempt | ConnectShyft | ConnectShyft | historical_only | No ownership change in Slice 12 |
| Call | ConnectShyft | ConnectShyft | historical_only | No ownership change in Slice 12 |
| Voicemail | ConnectShyft | ConnectShyft | historical_only | No ownership change in Slice 12 |
| CallRecording | ConnectShyft | ConnectShyft | historical_only | No ownership change in Slice 12 |
| ProviderEvent | ConnectShyft | ConnectShyft | historical_only | Provider/correlation ownership remains ConnectShyft |
| TimelineEvent | ConnectShyft | ConnectShyft | derived_projection | Timeline remains a ConnectShyft projection |
| WorkIntent | ConnectShyft | ConnectShyft | review_rebind | Temporary bridge object remains ConnectShyft-owned |

## Slice 13 Boundary Rule

PeopleCore now owns persistence truth for person/contact-point/household/resolver-review concepts.

ConnectShyft still owns communication objects and current neighbor-facing APIs.

The seam is the integration point between them. Slice 13 does not bypass that seam by replacing ConnectShyft ownership everywhere at once.

Slice 13 read-authority rule:

- PeopleCore can block certainty
- PeopleCore cannot assert person-to-neighbor equivalence
- no current PeopleCore link or unavailable PeopleCore preserves legacy ConnectShyft behavior
- multiple current PeopleCore links produce ambiguity
- single current PeopleCore link plus a different legacy concrete winner produces ambiguity
- single current PeopleCore link plus legacy no-match remains no-match in this slice

Explicit non-goals for this boundary in Slice 13:

- no reconciliation
- no crosswalk
- no auto-linking
- no merge engine
- no scoring engine

## Slice 14 Handoff

The next logical slice is operationalization of ambiguity and resolver handling at this boundary.

It is not a reconciliation or automatic convergence slice.
