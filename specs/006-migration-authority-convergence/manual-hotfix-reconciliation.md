# Manual Hotfix Reconciliation

## Current known manual hotfixes

### 1. Shape ConnectShyft neighbor phones for canonical identity
Migration:
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js`

Status:
- production schema patched manually
- must not be rerun blindly
- must be verified and then mark-applied in `public.knex_migrations`

### 2. Add ConnectShyft neighbor canonical phone lookup index
Migration:
- `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js`

Status:
- verify whether index already exists
- if yes, mark applied
- if no, prepare it to run through the authorized runner after promotion into shared authority

## Rule
Speckit may generate tooling and docs for this.
Speckit must not execute the mark-applied SQL.
