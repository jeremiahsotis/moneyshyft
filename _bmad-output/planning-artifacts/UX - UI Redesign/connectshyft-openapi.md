project_lane: connectshyft

---

```md
# FILE: ConnectShyft-OpenAPI.md

# ConnectShyft OpenAPI (MVP)
Project: ConnectShyft
Purpose: Developer-ready OpenAPI schema (YAML embedded in Markdown) for MVP endpoints + webhook contracts.
Envelope taxonomy (canonical): success | refusal | error

---

### Notes

- Twilio signature validation and replay-safe idempotency are mandatory even if not modeled as security schemes.

---

## OpenAPI YAML

```yaml
openapi: 3.0.3
info:
  title: ConnectShyft API
  version: 0.1.0
servers:
  - url: /api/v1
tags:
  - name: ConnectShyft
  - name: ConnectShyft Webhooks

paths:
  /connectshyft/context:
    get:
      tags: [ConnectShyft]
      summary: Get active tenant + orgUnit context
      responses:
        "200":
          description: Context
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EnvelopeSuccessContext"
        "401":
          description: Unauthorized
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeError" }

  /connectshyft/inbox:
    get:
      tags: [ConnectShyft]
      summary: List orgUnit inbox (UNCLAIMED, attention ordering)
      parameters:
        - in: query
          name: cursor
          schema: { type: string, nullable: true }
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 100, default: 25 }
      responses:
        "200":
          description: Inbox threads
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessInbox" }

  /connectshyft/mine:
    get:
      tags: [ConnectShyft]
      summary: List threads claimed by the current user
      parameters:
        - in: query
          name: cursor
          schema: { type: string, nullable: true }
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 100, default: 25 }
      responses:
        "200":
          description: My threads
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessMine" }

  /connectshyft/threads:
    post:
      tags: [ConnectShyft]
      summary: Ensure active thread (idempotent by uniqueness)
      description: >
        Returns an existing active thread for (tenant_id, org_unit_id, neighbor_id) when present;
        otherwise creates a new thread in UNCLAIMED state.
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ThreadEnsureRequest" }
      responses:
        "200":
          description: Existing thread returned
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessThread" }
        "201":
          description: Thread created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessThread" }
        "422":
          description: Refusal
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeRefusal" }

  /connectshyft/threads/{threadId}:
    get:
      tags: [ConnectShyft]
      summary: Thread detail (timeline)
      parameters:
        - in: path
          name: threadId
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Thread detail
          content:
            application/json:
              schema:
                { $ref: "#/components/schemas/EnvelopeSuccessThreadDetail" }

  /connectshyft/threads/{threadId}/claim:
    post:
      tags: [ConnectShyft]
      summary: Claim an UNCLAIMED thread
      parameters:
        - in: path
          name: threadId
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Claimed
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessThread" }
        "409":
          description: Refusal (already claimed)
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeRefusal" }

  /connectshyft/threads/{threadId}/close:
    post:
      tags: [ConnectShyft]
      summary: Close a thread (optional closing note)
      parameters:
        - in: path
          name: threadId
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: false
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ThreadCloseRequest" }
      responses:
        "200":
          description: Closed
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessThread" }

  /connectshyft/threads/{threadId}/reopen:
    post:
      tags: [ConnectShyft]
      summary: Reopen a CLOSED thread (used by UI on outbound tap)
      description: >
        Transition: CLOSED -> UNCLAIMED
        Emits audit: thread_reopened_by_user
        Resets inactivity + escalation (stage=0/count=0) and recalculates next_evaluation_at_utc from now.
      parameters:
        - in: path
          name: threadId
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Reopened
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessThread" }

  /connectshyft/threads/{threadId}/messages:
    post:
      tags: [ConnectShyft]
      summary: Send outbound SMS to neighbor
      description: >
        If thread is CLOSED, outbound send tap reopens immediately.
        Outbound SMS accepted updates last_activity_at_utc and last_engagement_at_utc.
        If neighbor prefers_texting=NO, requires override_reason and audits override.
      parameters:
        - in: path
          name: threadId
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/OutboundSmsRequest" }
      responses:
        "200":
          description: SMS queued/accepted
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessMessage" }
        "422":
          description: Refusal
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeRefusal" }

  /connectshyft/threads/{threadId}/calls/bridge:
    post:
      tags: [ConnectShyft]
      summary: Start bridge call (no WebRTC, no SIP)
      description: >
        Bridge call only. Two leg flow.
        On CONNECTED: auto-claim and reset escalation + inactivity.
        Manual retry only; no automatic redial.
      parameters:
        - in: path
          name: threadId
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Call initiated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessBridgeCall" }
        "422":
          description: Refusal
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeRefusal" }

  /connectshyft/neighbors:
    get:
      tags: [ConnectShyft]
      summary: Search neighbors (tenant-scoped)
      parameters:
        - in: query
          name: q
          required: false
          schema: { type: string, nullable: true }
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 50, default: 25 }
      responses:
        "200":
          description: Neighbor search results
          content:
            application/json:
              schema:
                { $ref: "#/components/schemas/EnvelopeSuccessNeighborSearch" }

    post:
      tags: [ConnectShyft]
      summary: Create neighbor (tenant-scoped)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/NeighborCreateRequest" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessNeighbor" }
        "422":
          description: Refusal
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeRefusal" }

  /connectshyft/neighbors/{neighborId}:
    patch:
      tags: [ConnectShyft]
      summary: Update neighbor (tenant-scoped; access-controlled)
      parameters:
        - in: path
          name: neighborId
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/NeighborUpdateRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccessNeighbor" }
        "403":
          description: Refusal
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeRefusal" }

  /connectshyft/webhooks/twilio/sms:
    post:
      tags: [ConnectShyft Webhooks]
      summary: Twilio inbound SMS webhook (signature validated, idempotent)
      security: []
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              additionalProperties: true
      responses:
        "200":
          description: Accepted
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccess" }

  /connectshyft/webhooks/twilio/voice:
    post:
      tags: [ConnectShyft Webhooks]
      summary: Twilio inbound voice webhook (routing matrix)
      security: []
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              additionalProperties: true
      responses:
        "200":
          description: TwiML response (deterministic)
          content:
            text/xml:
              schema: { type: string }

  /connectshyft/webhooks/twilio/transcription:
    post:
      tags: [ConnectShyft Webhooks]
      summary: Twilio transcription webhook (idempotent by TranscriptionSid)
      security: []
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              additionalProperties: true
      responses:
        "200":
          description: Transcript attached
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EnvelopeSuccess" }

components:
  schemas:
    EnvelopeSuccess:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data: { type: object }
      required: [success, data]

    EnvelopeSuccessContext:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data:
          type: object
          properties:
            tenant_id: { type: string, format: uuid }
            org_unit_id: { type: string, format: uuid }
            user_id: { type: string, format: uuid }
          required: [tenant_id, org_unit_id, user_id]
      required: [success, data]

    EnvelopeRefusal:
      type: object
      properties:
        success: { type: boolean, enum: [false] }
        refusal:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
            details: { type: object, additionalProperties: true }
          required: [code, message]
      required: [success, refusal]

    EnvelopeError:
      type: object
      properties:
        success: { type: boolean, enum: [false] }
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
          required: [code, message]
      required: [success, error]

    ThreadEnsureRequest:
      type: object
      properties:
        neighbor_id: { type: string, format: uuid }
      required: [neighbor_id]

    ThreadCloseRequest:
      type: object
      properties:
        closing_note: { type: string, nullable: true, maxLength: 500 }

    OutboundSmsRequest:
      type: object
      properties:
        body: { type: string, minLength: 1, maxLength: 2000 }
        override_reason:
          type: string
          nullable: true
          description: Required when neighbor prefers_texting=NO
      required: [body]

    EnvelopeSuccessInbox:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data:
          type: object
          properties:
            items:
              type: array
              items: { $ref: "#/components/schemas/ThreadListItem" }
            next_cursor: { type: string, nullable: true }
          required: [items]
      required: [success, data]

    EnvelopeSuccessMine:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data:
          type: object
          properties:
            items:
              type: array
              items: { $ref: "#/components/schemas/ThreadListItem" }
            next_cursor: { type: string, nullable: true }
          required: [items]
      required: [success, data]

    EnvelopeSuccessThread:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data: { $ref: "#/components/schemas/Thread" }
      required: [success, data]

    EnvelopeSuccessThreadDetail:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data:
          type: object
          properties:
            thread: { $ref: "#/components/schemas/Thread" }
            timeline:
              type: array
              items: { $ref: "#/components/schemas/TimelineItem" }
          required: [thread, timeline]
      required: [success, data]

    EnvelopeSuccessMessage:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data: { $ref: "#/components/schemas/Message" }
      required: [success, data]

    EnvelopeSuccessBridgeCall:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data:
          type: object
          properties:
            bridge_call_id: { type: string, format: uuid }
            state: { type: string }
          required: [bridge_call_id, state]
      required: [success, data]

    EnvelopeSuccessNeighborSearch:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data:
          type: object
          properties:
            items:
              type: array
              items: { $ref: "#/components/schemas/Neighbor" }
          required: [items]
      required: [success, data]

    EnvelopeSuccessNeighbor:
      type: object
      properties:
        success: { type: boolean, enum: [true] }
        data: { $ref: "#/components/schemas/Neighbor" }
      required: [success, data]

    ThreadListItem:
      type: object
      properties:
        thread_id: { type: string, format: uuid }
        neighbor_id: { type: string, format: uuid }
        neighbor_display_name: { type: string }
        state: { type: string, enum: [UNCLAIMED, CLAIMED, CLOSED] }
        claimed_by_user_id: { type: string, format: uuid, nullable: true }
        last_activity_at_utc: { type: string, format: date-time }
        needs_attention_label: { type: string, nullable: true }
        unread_voicemail_count_mine: { type: integer, minimum: 0 }
      required:
        [
          thread_id,
          neighbor_id,
          neighbor_display_name,
          state,
          last_activity_at_utc,
        ]

    Thread:
      type: object
      properties:
        id: { type: string, format: uuid }
        neighbor_id: { type: string, format: uuid }
        org_unit_id: { type: string, format: uuid }
        state: { type: string, enum: [UNCLAIMED, CLAIMED, CLOSED] }
        claimed_by_user_id: { type: string, format: uuid, nullable: true }
        escalation_stage: { type: integer, minimum: 0, maximum: 3 }
        escalation_count: { type: integer, minimum: 0 }
        next_evaluation_at_utc:
          { type: string, format: date-time, nullable: true }
        last_activity_at_utc: { type: string, format: date-time }
        last_engagement_at_utc: { type: string, format: date-time }
      required:
        [
          id,
          neighbor_id,
          org_unit_id,
          state,
          escalation_stage,
          escalation_count,
          last_activity_at_utc,
          last_engagement_at_utc,
        ]

    TimelineItem:
      oneOf:
        - $ref: "#/components/schemas/Message"
        - $ref: "#/components/schemas/Voicemail"
        - $ref: "#/components/schemas/SystemEvent"

    Message:
      type: object
      properties:
        type: { type: string, enum: [message] }
        id: { type: string, format: uuid }
        direction: { type: string, enum: [INBOUND, OUTBOUND] }
        body: { type: string }
        created_at_utc: { type: string, format: date-time }
      required: [type, id, direction, body, created_at_utc]

    Voicemail:
      type: object
      properties:
        type: { type: string, enum: [voicemail] }
        id: { type: string, format: uuid }
        created_at_utc: { type: string, format: date-time }
        transcript_text: { type: string, nullable: true }
        duration_seconds: { type: integer, nullable: true }
      required: [type, id, created_at_utc]

    SystemEvent:
      type: object
      properties:
        type: { type: string, enum: [system_event] }
        event_type: { type: string }
        created_at_utc: { type: string, format: date-time }
        metadata: { type: object, additionalProperties: true }
      required: [type, event_type, created_at_utc, metadata]

    NeighborCreateRequest:
      type: object
      properties:
        display_name: { type: string, minLength: 1 }
        email: { type: string, format: email, nullable: true }
        prefers_texting:
          { type: string, enum: [UNKNOWN, YES, NO], default: UNKNOWN }
        phones:
          type: array
          minItems: 1
          items:
            type: object
            properties:
              phone_e164: { type: string }
              is_primary: { type: boolean, default: true }
              is_shared_phone: { type: boolean, default: false }
            required: [phone_e164]
      required: [display_name, phones]

    NeighborUpdateRequest:
      type: object
      properties:
        display_name: { type: string, nullable: true }
        email: { type: string, format: email, nullable: true }
        prefers_texting:
          { type: string, enum: [UNKNOWN, YES, NO], nullable: true }
      additionalProperties: false

    Neighbor:
      type: object
      properties:
        id: { type: string, format: uuid }
        display_name: { type: string }
        email: { type: string, nullable: true }
        prefers_texting: { type: string, enum: [UNKNOWN, YES, NO] }
        phones:
          type: array
          items:
            type: object
            properties:
              phone_e164: { type: string }
              is_primary: { type: boolean }
              is_shared_phone: { type: boolean }
            required: [phone_e164, is_primary, is_shared_phone]
      required: [id, display_name, prefers_texting, phones]
```
