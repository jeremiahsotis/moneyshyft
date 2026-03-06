# RouteShyft Architecture

## Stack

Node + Express + TypeScript (tsc)\
Postgres + Knex\
Droplet filesystem storage

## Module Layout

src/modules/route/ - domain - application - infrastructure - api

Mounted at /api/v1/route/\* WP is thin frontend only.
