# Data Contract Context

## Domain objects involved

### Person
A tenant-scoped operational person record.

Important fields:
- person_id
- tenant_id
- identity_cluster_id optional
- first_name
- last_name
- preferred_name optional
- date_of_birth optional
- phone references
- email references
- status
- created_at
- updated_at

### Household
A tenant-scoped household record.

Important fields:
- household_id
- tenant_id
- household_name optional
- current_address_id optional
- status
- created_at
- updated_at

### HouseholdMembership
Links people to households.

Important fields:
- household_membership_id
- household_id
- person_id
- membership_role
- active
- start_date optional
- end_date optional

### Address
Normalized address record.

Important fields:
- address_id
- tenant_id
- line_1
- line_2 optional
- city
- state
- zip
- county optional
- normalized_hash optional
- active
- created_at

### AddressLink
Optional conceptual link object if address ownership needs explicit linking.

Can support:
- person address
- household address
- mailing vs physical
- current vs historical

### Relationship
Links two people with a typed relationship.

Important fields:
- relationship_id
- tenant_id
- person_id_from
- person_id_to
- relationship_type
- active
- created_at

### IdentityCluster
Platform-level identity grouping.

Important fields:
- identity_cluster_id
- cluster_status
- confidence_summary optional
- created_at
- updated_at

### IdentityAlias
External or alternate identifier mapping.

Important fields:
- identity_alias_id
- tenant_id optional
- person_id optional
- identity_cluster_id optional
- alias_type
- alias_value
- source_system optional
- created_at

### IdentityMatchCandidate
Potential duplicate that needs review.

Important fields:
- identity_match_candidate_id
- tenant_id
- person_id_a
- person_id_b
- match_confidence
- match_reason_summary
- review_status
- created_at
- reviewed_at optional
- reviewed_by optional

### IdentityMergeEvent
Audit event capturing confirmed linkage or reversal.

Important fields:
- identity_merge_event_id
- identity_cluster_id
- person_id
- action_type
- actor_id
- occurred_at
- notes optional

## Important states

### person status
- active
- inactive
- archived

### household status
- active
- inactive
- archived

### match candidate review_status
- pending
- confirmed
- rejected
- deferred

### cluster_status
- active
- flagged
- archived

## API / event touchpoints

Potential events:
- person_created
- person_updated
- household_created
- household_membership_added
- address_linked
- relationship_created
- identity_match_candidate_created
- identity_match_confirmed
- identity_match_rejected
- identity_cluster_link_added
- identity_cluster_link_removed