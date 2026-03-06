# Quick Deployment Checklist

**Fix:** Migration numbering conflict (004 → 009)
**Estimated Time:** 5-10 minutes
**Downtime:** 30-60 seconds (optional)

---

## Pre-Flight

- [ ] SSH into production server: `ssh user@production-server`
- [ ] Navigate to project: `cd ~/moneyshyft`
- [ ] Check current status: `docker-compose ps`

---

## Critical Steps (In Order)

### 1. BACKUP DATABASE (Required)
```bash
mkdir -p ~/moneyshyft-backups
BACKUP_FILE=~/moneyshyft-backups/moneyshyft-$(date +%Y%m%d-%H%M%S).sql
docker exec moneyshyft-postgres-1 pg_dump -U jeremiahotis moneyshyft > $BACKUP_FILE
ls -lh $BACKUP_FILE  # Verify backup exists and has size
```
- [ ] Backup created
- [ ] Backup file size > 0 bytes

### 2. PULL CHANGES
```bash
git pull origin main
ls -la src/src/migrations/ | grep -E "004|009"
```
- [ ] Pulled successfully
- [ ] See: `009_add_envelope_budgeting.ts` (new)
- [ ] See: `004_add_debt_tracking.ts` (unchanged)

### 3. UPDATE DATABASE TRACKING
```bash
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
UPDATE knex_migrations
SET name = '009_add_envelope_budgeting.ts'
WHERE name = '004_add_envelope_budgeting.ts';
"
```
- [ ] Shows: `UPDATE 1`

### 4. VERIFY UPDATE
```bash
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
SELECT name FROM knex_migrations WHERE name LIKE '009%' OR name LIKE '004%';
"
```
- [ ] Shows: `004_add_debt_tracking.ts`
- [ ] Shows: `009_add_envelope_budgeting.ts`
- [ ] Does NOT show: `004_add_envelope_budgeting.ts`

### 5. REBUILD CONTAINER
```bash
docker-compose build --no-cache node
docker-compose up -d --no-deps --force-recreate node
```
- [ ] Build successful
- [ ] Container restarted

### 6. VERIFY DEPLOYMENT
```bash
# Check status
docker-compose ps  # All should show "Up"

# Check logs (no errors)
docker logs moneyshyft-node-1 --tail 30

# Test signup
curl -X POST 'http://localhost:3000/api/v1/auth/signup' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"test@example.com","password":"Test123","firstName":"Test","lastName":"User","householdName":"Test"}'
```
- [ ] All containers "Up"
- [ ] No errors in logs
- [ ] Signup returns 200 OK with user data

---

## Success Indicators

✅ Backend log shows: "MoneyShyft API server running on 0.0.0.0:3000"
✅ No "Cannot find module" errors
✅ No "relation does not exist" errors
✅ Database shows only one `004_` migration
✅ Signup endpoint works

---

## If Something Goes Wrong

**Quick Rollback:**
```bash
# Revert database
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
UPDATE knex_migrations SET name = '004_add_envelope_budgeting.ts'
WHERE name = '009_add_envelope_budgeting.ts';
"

# Revert code
git reset --hard cc0ab7d

# Rebuild
docker-compose down
docker-compose build --no-cache node
docker-compose up -d
```

**Restore from Backup:**
See PRODUCTION_DEPLOYMENT_GUIDE.md → Rollback Step 4

---

## Post-Deployment

- [ ] Monitor logs for 5 minutes: `docker logs moneyshyft-node-1 -f`
- [ ] Test production frontend (if deployed)
- [ ] Delete test user created during verification
- [ ] Keep backup for 7 days minimum
