# Data Contract Context

## Hook / contract objects involved

### VoucherRedemptionHook
Minimal contract for external redemption consumers.

Important fields:
- voucher_id
- voucher_code_or_token
- redemption_context_type
- redemption_context_id optional
- requested_amount optional
- requested_at

### RouteRequestHook
Minimal route-eligible request contract.

Important fields:
- route_request_hook_id
- source_type
- source_id
- request_type
- person_id optional
- household_id optional
- address_id optional
- requested_service_window optional
- notes optional
- created_at

Examples:
- furniture_delivery
- furniture_pickup
- donation_pickup
- repair_material_dropoff

### WorkItemHook
Minimal operational work contract for future planning workflows.

Important fields:
- work_item_hook_id
- source_type
- source_id
- work_type
- priority optional
- requested_start optional
- requested_due optional
- location_reference optional
- notes optional
- created_at

Examples:
- woodshop_task
- repair_workflow
- prep_task
- inspection_task

### DonorPickupHook
Minimal donation pickup initiation contract.

Important fields:
- donor_pickup_hook_id
- donor_reference optional
- source_type
- source_id
- pickup_address_id optional
- item_summary
- notes optional
- created_at

## Event touchpoints

Potential events:
- voucher_redemption_requested
- voucher_redeemed
- route_request_created
- route_request_canceled
- work_item_created
- work_item_updated
- donor_pickup_requested
- donor_pickup_updated

## Important rule

These are **hook contracts**, not finished product domain models.
They should carry only the stable information needed for future modules to attach later.