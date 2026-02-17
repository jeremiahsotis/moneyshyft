# RouteShyft API Specification (V1)

Version: 2026-02-17

## 0. Scope

This document defines the implementation-ready API contract for
RouteShyft as a module inside the Shyft monolith.

-   Base path: `/api/v1/route`
-   Namespaces:
    -   Public (unauthenticated): `/api/v1/route/public/*`
    -   Staff (authenticated): `/api/v1/route/staff/*`
    -   Driver (authenticated): `/api/v1/route/driver/*`
-   Envelope policy:
    -   **Business refusals** return **HTTP 200** with `ok=false` and a
        refusal `code`.
    -   **System errors** return **HTTP 4xx/5xx** with `ok=false` and
        `error.code`.

## 1. Cross-Cutting Requirements

### 1.1 Tenancy

All endpoints execute in a tenant context.

-   Tenant is derived from auth context (staff/driver) or from request
    configuration for public endpoints (e.g., site configuration, API
    key-free).
-   Every response includes `tenant_id` in `data` when relevant.
-   All DB queries MUST filter by `tenant_id`.

### 1.2 Time handling (non-negotiable)

-   Store timestamps in UTC fields `*_at_utc`.
-   Store scheduled dates as `date_local` (dispatch timezone) and
    day-part as enum.
-   All user-visible times must be rendered in dispatch timezone
    (`route.settings.timezone`, default `America/Indiana/Indianapolis`).

### 1.3 Authentication (Staff/Driver)

-   Cookie-based session (first-party auth) with CSRF for state-changing
    routes.
-   Authorization is capability-based:
    -   Staff capabilities (example):
        -   `route:staff:read`, `route:staff:write`
    -   Driver capabilities:
        -   `route:driver:read`, `route:driver:write`

### 1.4 CSRF

For cookie-auth endpoints: - All `POST/PUT/PATCH/DELETE` require
`X-CSRF-Token` header. - If missing/invalid → system error `HTTP 403`
with `error.code=CSRF_INVALID`.

### 1.5 Rate limiting and spam controls (Public)

Applies to `/public/*`: - Honeypot field required (must be empty). -
IP+UA rate limiting (hash stored in events). - Optional CAPTCHA
(configurable provider). If enabled and CAPTCHA fails, return refusal
with `code=CAPTCHA_FAILED`. - If rate limited, return refusal with
`code=RATE_LIMITED`. - If honeypot triggered, return refusal with
`code=HONEYPOT_BLOCKED`.

### 1.6 Idempotency

-   Public request submission supports idempotency via header
    `Idempotency-Key` (recommended).
    -   Same key + same normalized payload within 24h returns the
        original success response.
    -   Same key + different payload returns refusal
        `IDEMPOTENCY_KEY_CONFLICT`.
-   Driver completion supports idempotency with `Idempotency-Key` to
    prevent duplicate completion records in flaky networks.
    -   Same key returns same appended completion record id.

### 1.7 Pagination

List endpoints use cursor pagination: - Request params: `limit` (default
25, max 200), `cursor` (opaque string) - Response fields:
`data.items[]`, `data.next_cursor`

### 1.8 Common response envelopes

#### Success

``` json
{
  "ok": true,
  "data": { }
}
```

#### Refusal (business rule)

``` json
{
  "ok": false,
  "code": "SOME_REFUSAL_CODE",
  "message": "Human-readable message safe for UI",
  "data": { }
}
```

#### Error (system)

``` json
{
  "ok": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## 2. Domain Enums and Types

### 2.1 Enums

-   `day_part`: `morning | afternoon`
-   `request_type`: `pickup | delivery | ride`
-   `request_status`:
    `submitted | triage | scheduled | completed | refused | waitlisted | canceled`
-   `run_status`:
    `draft | published | in_progress | completed | canceled`
-   `stop_status`:
    `scheduled | en_route | arrived | completed | skipped | canceled`
-   `stop_type`: `delivery | pickup | ride`
-   `availability_status`: `open | tight | full`
-   `triage_size`: `small | medium | large`
-   `triage_stairs`: `none | some | many`
-   `media_kind_request`: `photo | document`
-   `media_kind_stop`: `photo | signature`

### 2.2 Refusal Codes (canonical)

Public: - `HONEYPOT_BLOCKED` - `RATE_LIMITED` - `CAPTCHA_FAILED` -
`VALIDATION_FAILED` - `NOT_ELIGIBLE_ZIP` - `DATE_OUT_OF_HORIZON` -
`DAY_PART_NOT_AVAILABLE` - `BLACKOUT` - `CAPACITY_FULL` -
`WAITLIST_DISABLED` - `ALREADY_WAITLISTED` - `IDEMPOTENCY_KEY_CONFLICT`

Staff: - `REQUEST_NOT_FOUND` - `INVALID_STATE_TRANSITION` -
`CAPACITY_FULL_STAFF_NO_OVERBOOK` - `RUN_NOT_FOUND` - `STOP_NOT_FOUND` -
`PUBLISH_CONSTRAINT_VIOLATION` - `POST_PUBLISH_GOVERNANCE_BLOCK`

Driver: - `STOP_NOT_ASSIGNED_TO_DRIVER` - `STOP_NOT_IN_TODAY_RUN` -
`INVALID_STATE_TRANSITION` - `COMPLETION_ALREADY_RECORDED` (only if you
choose to block multiple completions; default is allow multiple records,
but UI should treat newest as canonical)

### 2.3 Error Codes (system)

-   `UNAUTHENTICATED`
-   `FORBIDDEN`
-   `CSRF_INVALID`
-   `VALIDATION_ERROR`
-   `DB_ERROR`
-   `INTERNAL_ERROR`

## 3. Public API (Unauthenticated)

### 3.1 GET /public/availability

Check availability for a ZIP over a date range and return eligible
slots.

**Query params** - `zip` (string, required; 5 digits) -
`from_date_local` (YYYY-MM-DD, optional; default today in dispatch
timezone) - `to_date_local` (YYYY-MM-DD, optional; default today+21
days) - `request_type` (pickup\|delivery\|ride, optional; default
pickup)

**Response (success)**

``` json
{
  "ok": true,
  "data": {
    "zip": "46802",
    "timezone": "America/Indiana/Indianapolis",
    "horizon_days": 21,
    "days": [
      {
        "date_local": "2026-02-16",
        "day_parts": [
          {
            "day_part": "morning",
            "status": "open",
            "max_stops": 10,
            "used_stops": 6,
            "max_minutes": 210,
            "used_minutes": 150,
            "buffer_minutes": 30,
            "alternatives": []
          },
          {
            "day_part": "afternoon",
            "status": "full",
            "max_stops": 10,
            "used_stops": 10,
            "max_minutes": 210,
            "used_minutes": 225,
            "buffer_minutes": 30,
            "alternatives": [
              { "date_local": "2026-02-17", "day_part": "morning", "status": "open" }
            ]
          }
        ]
      }
    ]
  }
}
```

**Refusals** - If zip has no enabled rule in horizon: `NOT_ELIGIBLE_ZIP`
(200 ok=false) - If query date range exceeds horizon:
`DATE_OUT_OF_HORIZON`

**Implementation notes** - Capacity counts usage from stops with status
in: `scheduled | en_route | arrived | completed`. - Status `tight` is
within 10% of limits (minutes or stops).

------------------------------------------------------------------------

### 3.2 POST /public/requests

Submit a new pickup/delivery/ride request.

**Headers** - `Idempotency-Key` (optional, recommended) - If captcha
enabled: `X-Captcha-Token` (required) - Honeypot field included in body
(required; must be empty)

**Request body**

``` json
{
  "honeypot": "",
  "request_type": "pickup",
  "requester": {
    "name": "First Last",
    "phone": "2605551212",
    "email": "person@example.com"
  },
  "locations": {
    "pickup_address": "1600 S Calhoun St, Fort Wayne, IN",
    "dropoff_address": null,
    "zip": "46802"
  },
  "preferred": {
    "date_local": "2026-02-20",
    "day_part": "morning"
  },
  "details": {
    "notes_safe": "Optional minimal note",
    "photos": ["<media_ref_optional>"]
  }
}
```

**Validation rules** - `requester.name` required. - At least one of
`phone` or `email` recommended; if absent, still accept (but skip
confirmation email). - `zip` required, 5 digits. -
`preferred.date_local` required and must be within horizon. -
`preferred.day_part` required. - `honeypot` must be empty. - If `photos`
are provided they must be valid `media_ref` UUIDs that belong to tenant
and are not deleted.

**Success response**

``` json
{
  "ok": true,
  "data": {
    "request_id": "uuid",
    "status": "submitted",
    "preferred": { "date_local": "2026-02-20", "day_part": "morning" },
    "confirmation": {
      "email_sent": true
    }
  }
}
```

**Refusals** - `HONEYPOT_BLOCKED` - `RATE_LIMITED` - `CAPTCHA_FAILED` -
`VALIDATION_FAILED` (with `data.fields`) - `NOT_ELIGIBLE_ZIP` -
`BLACKOUT` - `DAY_PART_NOT_AVAILABLE` - `CAPACITY_FULL` (include
alternatives, and waitlist offer if enabled) -
`IDEMPOTENCY_KEY_CONFLICT`

**CAPACITY_FULL refusal example**

``` json
{
  "ok": false,
  "code": "CAPACITY_FULL",
  "message": "That time is full. Choose another option.",
  "data": {
    "alternatives": [
      { "date_local": "2026-02-21", "day_part": "morning" },
      { "date_local": "2026-02-22", "day_part": "afternoon" }
    ],
    "waitlist": {
      "enabled": true
    }
  }
}
```

------------------------------------------------------------------------

### 3.3 POST /public/waitlist

Join the waitlist for a request that could not be scheduled.

**Request body**

``` json
{
  "request_id": "uuid"
}
```

**Success**

``` json
{
  "ok": true,
  "data": {
    "waitlist_id": "uuid",
    "request_id": "uuid",
    "expires_at_utc": "2026-03-01T00:00:00Z"
  }
}
```

**Refusals** - `WAITLIST_DISABLED` - `ALREADY_WAITLISTED` -
`REQUEST_NOT_FOUND`

------------------------------------------------------------------------

### 3.4 POST /public/surveys

Submit a satisfaction survey using a token link.

**Request body**

``` json
{
  "token": "opaque-token",
  "rating": 5,
  "comment": "Optional comment"
}
```

**Success**

``` json
{
  "ok": true,
  "data": { "received": true }
}
```

**Refusals** - `VALIDATION_FAILED` - `REQUEST_NOT_FOUND` (token unknown)
--- may also be a system 404; prefer refusal 200 ok=false to avoid
leaking token validity patterns.

## 4. Staff API (Authenticated)

### 4.1 GET /staff/requests

List requests for inbox/triage.

**Query params** - `status` (optional; default `submitted,triage`) -
`from_date_local` / `to_date_local` (optional) - pagination: `limit`,
`cursor`

**Success**

``` json
{
  "ok": true,
  "data": {
    "items": [
      {
        "request_id": "uuid",
        "request_type": "pickup",
        "status": "submitted",
        "requester_name": "First Last",
        "zip_code": "46802",
        "preferred_date_local": "2026-02-20",
        "preferred_day_part": "morning",
        "created_at_utc": "2026-02-16T17:10:00Z"
      }
    ],
    "next_cursor": null
  }
}
```

------------------------------------------------------------------------

### 4.2 POST /staff/requests/:id/triage

Update triage fields. Can also move request into `triage` status.

**Request body**

``` json
{
  "triage_size": "medium",
  "triage_stairs": "some",
  "triage_disassembly": false,
  "triage_notes_safe": "Optional minimal note",
  "set_status": "triage"
}
```

**Rules** - Only allowed if request.status in `submitted | triage`. -
Writes audit event: `route.request.triaged`.

**Success**

``` json
{
  "ok": true,
  "data": {
    "request_id": "uuid",
    "status": "triage"
  }
}
```

**Refusals** - `REQUEST_NOT_FOUND` - `INVALID_STATE_TRANSITION`

------------------------------------------------------------------------

### 4.3 POST /staff/requests/:id/schedule

Schedule a request into a run/stop, enforcing constraints.

**Request body**

``` json
{
  "scheduled_date_local": "2026-02-20",
  "scheduled_day_part": "morning",
  "window_start_local": "09:30",
  "window_end_local": "12:00",
  "vehicle_id": "uuid",
  "driver_user_id": "uuid",
  "policy": {
    "allow_overbook": false
  }
}
```

**Rules** - Default `allow_overbook=false`. - Must validate zip rule
enabled for that day part. - Must validate not in blackout. - Must
enforce capacity unless `allow_overbook=true` and caller has an elevated
capability (optional). - Creates/updates a `route.run` and creates a
`route.stop` linked to `request_id`. - Transitions request status to
`scheduled`.

**Success**

``` json
{
  "ok": true,
  "data": {
    "request_id": "uuid",
    "run_id": "uuid",
    "stop_id": "uuid",
    "status": "scheduled"
  }
}
```

**Refusals** - `REQUEST_NOT_FOUND` - `INVALID_STATE_TRANSITION` -
`BLACKOUT` - `DAY_PART_NOT_AVAILABLE` -
`CAPACITY_FULL_STAFF_NO_OVERBOOK`

------------------------------------------------------------------------

### 4.4 POST /staff/requests/:id/refuse

Refuse a request with structured refusal codes and alternatives.

**Request body**

``` json
{
  "refusal_code": "CAPACITY_FULL",
  "refusal_message": "We are full that day. Please choose another option.",
  "alternatives": [
    { "date_local": "2026-02-21", "day_part": "morning" }
  ]
}
```

**Success**

``` json
{
  "ok": true,
  "data": {
    "request_id": "uuid",
    "status": "refused"
  }
}
```

**Refusals** - `REQUEST_NOT_FOUND` - `INVALID_STATE_TRANSITION`

------------------------------------------------------------------------

### 4.5 GET /staff/calendar

Calendar aggregation for staff console.

**Query params** - `from_date_local` (required) - `to_date_local`
(required) - optional `day_part`

**Success**

``` json
{
  "ok": true,
  "data": {
    "from_date_local": "2026-02-16",
    "to_date_local": "2026-03-08",
    "days": [
      {
        "date_local": "2026-02-20",
        "morning": {
          "runs": 1,
          "stops": 8,
          "capacity_status": "tight"
        },
        "afternoon": {
          "runs": 0,
          "stops": 0,
          "capacity_status": "open"
        }
      }
    ]
  }
}
```

------------------------------------------------------------------------

### 4.6 GET /staff/runs

List runs.

**Query params** - `date_local` (optional) or
`from_date_local/to_date_local` - `day_part` (optional) - pagination

**Success**

``` json
{
  "ok": true,
  "data": {
    "items": [
      {
        "run_id": "uuid",
        "run_date_local": "2026-02-20",
        "day_part": "morning",
        "status": "draft",
        "vehicle_id": "uuid",
        "driver_user_id": "uuid",
        "stops_count": 8
      }
    ],
    "next_cursor": null
  }
}
```

------------------------------------------------------------------------

### 4.7 POST /staff/runs

Create a run.

**Request body**

``` json
{
  "run_date_local": "2026-02-20",
  "day_part": "morning",
  "vehicle_id": "uuid",
  "driver_user_id": "uuid"
}
```

**Success**

``` json
{
  "ok": true,
  "data": {
    "run_id": "uuid",
    "status": "draft"
  }
}
```

------------------------------------------------------------------------

### 4.8 GET /staff/runs/:runId

Get run detail with ordered stops.

**Success**

``` json
{
  "ok": true,
  "data": {
    "run_id": "uuid",
    "status": "draft",
    "run_date_local": "2026-02-20",
    "day_part": "morning",
    "vehicle": { "id": "uuid", "name": "District Truck" },
    "driver_user_id": "uuid",
    "stops": [
      {
        "stop_id": "uuid",
        "sequence_index": 0,
        "stop_type": "delivery",
        "status": "scheduled",
        "address": "....",
        "estimated_minutes": 35
      }
    ]
  }
}
```

------------------------------------------------------------------------

### 4.9 POST /staff/runs/:runId/publish

Publish a run. Enforces governance and locks sequence with auditable
modifications after publish.

**Request body**

``` json
{
  "policy": {
    "allow_reorder_after_publish": true
  }
}
```

**Rules** - Must validate run.status == `draft`. - Must validate stops
ordering policy: - deliveries → morning pickups → afternoon pickups
(within the run/day-part context). - Sets run.status to `published`. -
Writes audit event: `route.run.published`.

**Success**

``` json
{
  "ok": true,
  "data": { "run_id": "uuid", "status": "published" }
}
```

**Refusals** - `RUN_NOT_FOUND` - `INVALID_STATE_TRANSITION` -
`PUBLISH_CONSTRAINT_VIOLATION`

------------------------------------------------------------------------

### 4.10 POST /staff/stops/:stopId/move

Move/reorder a stop (draft or post-publish with audit).

**Request body**

``` json
{
  "target_run_id": "uuid",
  "target_sequence_index": 3,
  "reason": "dispatcher_adjustment"
}
```

**Rules** - If run is `draft`: allow move freely. - If run is
`published`: allow only if governance permits and record audit event
with before/after ordering. - Must preserve unique constraint
`(tenant_id, run_id, sequence_index)` by shifting others
transactionally.

**Success**

``` json
{
  "ok": true,
  "data": { "stop_id": "uuid", "run_id": "uuid", "sequence_index": 3 }
}
```

**Refusals** - `STOP_NOT_FOUND` - `RUN_NOT_FOUND` -
`POST_PUBLISH_GOVERNANCE_BLOCK`

## 5. Driver API (Authenticated)

### 5.1 GET /driver/today

Returns today's stops for the driver, grouped for UX.

**Query params** - optional `date_local` (defaults to today in dispatch
timezone)

**Success**

``` json
{
  "ok": true,
  "data": {
    "date_local": "2026-02-20",
    "timezone": "America/Indiana/Indianapolis",
    "runs": [
      {
        "run_id": "uuid",
        "day_part": "morning",
        "status": "published",
        "stops": [
          {
            "stop_id": "uuid",
            "sequence_index": 0,
            "stop_type": "delivery",
            "status": "scheduled",
            "address": "....",
            "window_start_local": "09:30",
            "window_end_local": "12:00"
          }
        ]
      }
    ]
  }
}
```

**Refusals** - If no assigned runs: success with empty list (do not
refuse).

------------------------------------------------------------------------

### 5.2 POST /driver/stops/:stopId/status

Update stop status: `en_route` or `arrived` (and optionally `skipped`).

**Headers** - `Idempotency-Key` (optional but recommended)

**Request body**

``` json
{
  "status": "en_route",
  "gps": {
    "lat": 41.0793,
    "lng": -85.1394,
    "accuracy_m": 22.4
  },
  "timestamp_local": "2026-02-20T10:15:00"
}
```

**Rules** - Only the assigned driver (or driver role) can update. -
Allowed transitions: - scheduled -\> en_route -\> arrived -
scheduled/en_route/arrived -\> skipped (if permitted) - Writes audit
event: `route.stop.status_changed`.

**Success**

``` json
{
  "ok": true,
  "data": { "stop_id": "uuid", "status": "en_route" }
}
```

**Refusals** - `STOP_NOT_FOUND` - `STOP_NOT_ASSIGNED_TO_DRIVER` -
`INVALID_STATE_TRANSITION`

------------------------------------------------------------------------

### 5.3 POST /driver/stops/:stopId/complete

Complete a stop and append an immutable completion record.

**Headers** - `Idempotency-Key` (recommended)

**Request body**

``` json
{
  "notes_safe": "Optional",
  "signer_name": "First Last",
  "media": {
    "photo_refs": ["uuid", "uuid"],
    "signature_ref": "uuid"
  },
  "gps": {
    "lat": 41.0793,
    "lng": -85.1394,
    "accuracy_m": 22.4
  }
}
```

**Rules** - Must be assigned driver. - Missing GPS must not block
completion. - Stop status transitions to `completed`. - Insert into
`route.completion_records` (append-only). Never update an existing
record. - Attach media via `route.stop_media`. - Write audit event:
`route.stop.completed`.

**Success**

``` json
{
  "ok": true,
  "data": {
    "stop_id": "uuid",
    "status": "completed",
    "completion_record_id": "uuid"
  }
}
```

**Refusals** - `STOP_NOT_FOUND` - `STOP_NOT_ASSIGNED_TO_DRIVER` -
`INVALID_STATE_TRANSITION` - `VALIDATION_FAILED` (e.g., signature_ref
present but not a valid media_ref)

------------------------------------------------------------------------

### 5.4 POST /driver/runs/:runId/behind

Mark run as behind schedule, for staff visibility.

**Request body**

``` json
{
  "behind": true,
  "reason_code": "traffic",
  "notes_safe": "Optional"
}
```

**Success**

``` json
{
  "ok": true,
  "data": { "run_id": "uuid", "behind": true }
}
```

## 6. Media API (Platform, used by RouteShyft UI)

Base path: `/api/v1/media`

### 6.1 POST /uploads/init

**Request body**

``` json
{
  "purpose": "route_stop_photo",
  "mime_type": "image/jpeg",
  "byte_size": 345678
}
```

**Success**

``` json
{
  "ok": true,
  "data": {
    "upload_id": "uuid",
    "upload_url": "/api/v1/media/uploads/uuid",
    "max_bytes": 8000000
  }
}
```

### 6.2 PUT /uploads/:uploadId

-   Raw bytes or multipart (implementation choice; contract should
    accept either based on client constraints).
-   Returns HTTP 200 with ok=true on accept.

### 6.3 POST /uploads/:uploadId/complete

Returns the `media_ref` UUID.

### 6.4 GET /:mediaRef?exp=...&sig=...

-   Signature-only access allowed only for allowlisted purposes and
    share_mode=ALLOWED.
-   Signature-only photo requests are watermarked.

## 7. Appendix: Validation Error Format

For `VALIDATION_FAILED` refusals:

``` json
{
  "ok": false,
  "code": "VALIDATION_FAILED",
  "message": "Fix the highlighted fields.",
  "data": {
    "fields": {
      "requester.name": "Required",
      "preferred.date_local": "Out of range"
    }
  }
}
```

## 8. Appendix: Audit/Event Minimums

Every mutation writes one `route.events` row with: - `event_type` (e.g.,
`route.request.created`) - `entity_type`
(`request|run|stop|media|spam`) - `entity_id` - `payload` (minimal
structured fields) - `ip_hash` and `ua_hash` for public/spam-related
events
