# Data Contract Context

## Domain objects involved

### Organization
Provider or organization associated with services.

Important fields:
- organization_id
- tenant_id optional depending on ownership model
- name
- description optional
- phone optional
- email optional
- website optional
- active
- created_at
- updated_at

### ServiceLocation
Physical or service-area location reference.

Important fields:
- service_location_id
- organization_id
- address_id optional
- location_name optional
- phone optional
- service_area_type
- service_area_reference optional
- active

### ServiceOffering
The core discoverable unit.

Important fields:
- service_offering_id
- organization_id
- primary_location_id optional
- service_name
- service_summary
- service_description optional
- service_category
- active
- visibility_status
- created_at
- updated_at

### ServiceRequirementProfile
Visible requirement summary for discovery use.

Important fields:
- service_requirement_profile_id
- service_offering_id
- eligibility_policy_id optional
- required_evidence_profile_id optional
- notes optional
- active

### ServiceAvailability
Availability representation/projection for search and detail.

Important fields:
- service_availability_id
- service_offering_id
- availability_type
- availability_payload
- timezone optional
- active
- last_verified_at optional

### ServiceSearchFacet
Optional projection or metadata structure for filtering/search.

Examples:
- category
- audience
- geographic area
- language
- accessibility flags

### ServiceFreshnessRecord
Tracks how recently service information was checked.

Important fields:
- service_freshness_record_id
- service_offering_id
- freshness_source_type
- checked_at
- confidence_note optional

## Important states

### service visibility_status
- visible
- hidden
- archived

### service active
- true
- false

### availability_type examples
- office_hours
- service_hours
- appointment_only
- by_schedule
- seasonal
- ad_hoc
- call_first

## API / event touchpoints

Potential events:
- organization_created
- service_offering_created
- service_offering_updated
- service_availability_updated
- service_requirement_profile_updated
- service_freshness_checked
- service_search_index_updated