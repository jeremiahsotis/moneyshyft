# Internal Rollout Enablement - Admin Console + Integrity Dashboard

Date: 2026-02-24
Environment: local/staging-equivalent runtime

## Feature Flag State

- Backend flags explicitly enabled in `/Users/jeremiahotis/projects/connectshyft/src/.env`:
  - `ADMIN_CONSOLE_V1=true`
  - `INTEGRITY_DASHBOARD_V1=true`
- Backend sample config updated in `/Users/jeremiahotis/projects/connectshyft/src/.env.example`:
  - `ADMIN_CONSOLE_V1=true`
  - `INTEGRITY_DASHBOARD_V1=true`
- Frontend sample config added in `/Users/jeremiahotis/projects/connectshyft/frontend/.env.example`:
  - `VITE_ADMIN_CONSOLE_V1=true`
  - `VITE_INTEGRITY_DASHBOARD_V1=true`

## Internal Cohort Rollout Baseline (Last 24h)

Data source: `platform.events` (`event_name LIKE 'admin.%'`)

- `adminEvents24h`: `26`
- `failures`: `0`
- Response code distribution:
  - `TENANT_MODULES_UPDATED`: `8`
  - `TENANT_STRUCTURE_RULES_UPDATED`: `8`
  - `TENANT_PERSON_CREATED`: `4`
  - `STRUCTURE_NODE_CREATED`: `6`

## Monitoring Query Commands Used

```bash
cd /Users/jeremiahotis/projects/connectshyft/src
node -e "require('dotenv').config(); const knex=require('knex'); const cfg=require('./knexfile.js'); const db=knex(cfg.development); db.withSchema('platform').table('events').where('event_name','like','admin.%').andWhere('occurred_at_utc','>=', db.raw(\"now() - interval '24 hours'\" )).count('* as count').then((rows)=>{ const total = Number(rows?.[0]?.count || 0); console.log(JSON.stringify({adminEvents24h: total}, null, 2)); }).catch((error)=>{ console.error(error); process.exitCode = 1; }).finally(()=>db.destroy());"
```

```bash
cd /Users/jeremiahotis/projects/connectshyft/src
node -e "require('dotenv').config(); const knex=require('knex'); const cfg=require('./knexfile.js'); const db=knex(cfg.development); (async ()=>{ const rows = await db.withSchema('platform').table('events').where('event_name','like','admin.%').andWhere('occurred_at_utc','>=', db.raw(\"now() - interval '24 hours'\" )).select(db.raw(\"coalesce((payload->>'responseCode'),'UNKNOWN') as response_code\"), db.raw(\"coalesce((payload->>'statusCode')::int, 0) as status_code\")); const summary = rows.reduce((acc, row)=>{ acc.total += 1; if (row.status_code >= 400) acc.failures += 1; acc.byCode[row.response_code] = (acc.byCode[row.response_code] || 0) + 1; return acc; }, { total: 0, failures: 0, byCode: {} }); console.log(JSON.stringify(summary, null, 2)); })().catch((e)=>{ console.error(e); process.exitCode=1; }).finally(()=>db.destroy());"
```
