# Data Models (Backend Quick Scan)

## Source of Truth
- Knex migrations in `src/src/migrations`

## Migration Inventory Highlights
- Foundational schema: `001_initial_schema.ts`
- Domain additions over time include:
  - envelope budgeting
  - debt tracking and payment plan integration
  - recurring transactions
  - goals, extra money, tags, scenarios
  - assignment/balance and budget-scope adjustments

## Notes for Monolith Migration
For Phase 0 platform kernel hardening, add dedicated platform tables/migrations for:
- `platform.sessions`
- `platform.events`
- `platform.outbox`

Also enforce canonical `tenant_id` strategy across all module-owned tables.
