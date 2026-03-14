# RouteShyft Implementation Binder

Version: 2026-02-17

## Architecture

-   Modular monolith (Node + Express + Postgres + Knex + TypeScript)
-   RouteShyft mounted at /api/v1/route/\*
-   WordPress is thin UI only (no DB writes, no media storage)
-   Media stored on droplet filesystem
-   Signed GET URLs for media
-   Signature-only links watermark photos
-   HTTP allowed in dev, HTTPS required in prod

## Core Principles

-   Algorithm recommends only
-   Humans approve all assignments
-   One dispatch engine (pickup, delivery, ride)
-   Capacity signaling only, no roster sharing

## State Machines

Request: submitted → triage → scheduled → completed\
Alternates: refused, waitlisted, canceled

Run: draft → published → in_progress → completed\
Alternate: canceled

Stop: scheduled → en_route → arrived → completed\
Alternates: skipped, canceled

## API Namespaces

Public: /api/v1/route/public/* Staff: /api/v1/route/staff/* Driver:
/api/v1/route/driver/\*

## Hard Cutover

Postgres is system of record. WP does not write RouteShyft state.
