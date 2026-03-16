# Data Contract Context

## Document Management objects

### Document
Logical document record.

Important fields:
- document_id
- tenant_id
- subject_type
- subject_id
- document_type_id
- status
- collected_at
- valid_from optional
- valid_until optional
- created_by
- created_at
- updated_at

### DocumentVersion
Physical version of a document.

Important fields:
- document_version_id
- document_id
- version_number
- storage_reference
- mime_type
- file_name
- checksum
- uploaded_by
- uploaded_at
- active

### DocumentRequest
Request for a participant or staff to provide a document.

Important fields:
- document_request_id
- subject_type
- subject_id
- requested_document_type_id optional
- required_evidence_type_id optional
- request_context_type
- request_context_id
- requested_by
- requested_at
- due_at optional
- status

### DocumentVerification
Verification lifecycle for a document.

Important fields:
- document_verification_id
- document_id
- verification_status
- verified_by optional
- verified_at optional
- verification_method optional
- notes optional
- expires_at optional

### DocumentLink
Links a document to workflow objects.

Important fields:
- document_link_id
- document_id
- linked_object_type
- linked_object_id
- link_role
- created_at
- created_by

### DocumentBundleReference
Scoped grouping of documents for future sharing/use.

Important fields:
- document_bundle_reference_id
- bundle_name optional
- created_at
- created_by
- active

## Shared Evidence objects

### Evidence
Reusable fact or claim.

Important fields:
- evidence_id
- evidence_type_id
- subject_type
- subject_id
- value
- value_type
- source_type
- collected_at
- last_verified_at optional
- verification_state
- valid_until optional
- active
- created_at
- updated_at

### EvidenceType
Canonical fact type.

Examples:
- monthly_income
- county_of_residence
- household_size
- identity
- veteran_status

Important fields:
- evidence_type_id
- code
- label
- value_type
- active

### EvidenceVerificationEvent
History of evidence confirmation/update.

Important fields:
- evidence_verification_event_id
- evidence_id
- event_type
- prior_value optional
- new_value optional
- verification_method
- verification_actor_type
- verification_actor_id optional
- verified_at

### EvidenceDocumentLink
Links evidence to supporting documents.

Important fields:
- evidence_document_link_id
- evidence_id
- document_id
- support_role
- created_at
- created_by

### EvidenceUsageEvent
Tracks reuse by later workflows.

Important fields:
- evidence_usage_event_id
- evidence_id
- usage_context_type
- usage_context_id
- used_by
- used_at
- accepted_for_use boolean
- rejection_reason optional

## Important states

### document status
- uploaded
- pending_verification
- verified
- rejected
- expired
- archived

### document request status
- requested
- link_sent
- uploaded
- pending_review
- completed
- expired
- canceled

### verification_status
- pending
- verified
- rejected
- needs_replacement
- expired

### evidence verification_state
- unverified
- participant_confirmed
- worker_confirmed
- document_backed
- expired
- superseded

## API / event touchpoints

Potential events:
- document_requested
- document_uploaded
- document_verified
- document_rejected
- document_bundle_created
- evidence_created
- evidence_updated
- evidence_confirmed
- evidence_linked_to_document
- evidence_used