# Production Deployment Guide: Migration Rename Fix

**Date:** 2026-01-01
**Fix:** Resolve duplicate migration numbering (004_ conflict)
**Commit:** ab97ea1

---

## Overview

This deployment fixes a critical migration numbering conflict where two migrations both had the prefix `004_`. The migration file has been renamed from `004_add_envelope_budgeting.ts` to `009_add_envelope_budgeting.ts`.

**Impact:** Low-risk deployment - the migration has already been applied to production database. We're only updating tracking metadata.

**Downtime:** ~30-60 seconds during container restart (optional - can do zero-downtime)

---

## Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] SSH access to production server
- [ ] Database credentials (user: jeremiahotis, password: Oiruueu12, db: moneyshyft)
- [ ] Sudo/docker permissions on production server
- [ ] Backup strategy ready (see step 1 below)
- [ ] Rollback plan reviewed (see end of document)

---

## Deployment Steps

### Step 1: Backup Production Database (CRITICAL)

**Why:** Always backup before any database changes, even metadata updates.

```bash
# SSH into production server
ssh user@your-production-server

# Create backup directory (if it doesn't exist)
mkdir -p ~/moneyshyft-backups

# Create timestamped backup
BACKUP_FILE=~/moneyshyft-backups/moneyshyft-$(date +%Y%m%d-%H%M%S).sql
docker exec moneyshyft-postgres-1 pg_dump -U jeremiahotis moneyshyft > $BACKUP_FILE

# Verify backup was created
ls -lh $BACKUP_FILE

# Optional: compress the backup
gzip $BACKUP_FILE
```

**Expected output:** Backup file should be several MB in size (verify it's not empty)

---

### Step 2: Verify Current State

```bash
# Check current Docker container status
docker-compose ps

# Verify current migrations in database
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "SELECT name FROM knex_migrations ORDER BY id;"

# Look for BOTH of these entries:
# - 004_add_debt_tracking.ts
# - 004_add_envelope_budgeting.ts  ← This will be renamed to 009_

# Check current migration files on disk
ls -la ~/moneyshyft/src/src/migrations/ | grep -E "004|009"
```

**Expected:** You should see `004_add_envelope_budgeting.ts` in both database and filesystem.

---

### Step 3: Pull Latest Changes

```bash
# Navigate to project directory
cd ~/moneyshyft

# Stash any local changes (if you have environment-specific files)
git stash

# Pull latest changes from main branch
git pull origin main

# Verify the migration file was renamed
ls -la src/src/migrations/ | grep -E "004|009"
```

**Expected output:**
```
004_add_debt_tracking.ts       ← Still exists
009_add_envelope_budgeting.ts  ← New name (was 004_add_envelope_budgeting.ts)
```

**Important:** If git pull fails due to local changes, see "Handling Local Changes" section below.

---

### Step 4: Update Migration Tracking in Database

**This is the CRITICAL step** - we must update the database to reflect the renamed migration.

```bash
# Update the knex_migrations table
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
UPDATE knex_migrations
SET name = '009_add_envelope_budgeting.ts'
WHERE name = '004_add_envelope_budgeting.ts';
"

# Verify the update (should show "UPDATE 1")
# Now verify the change
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
SELECT name FROM knex_migrations ORDER BY id;
"
```

**Expected output:**
```
UPDATE 1

# Then the SELECT should show:
001_initial_schema.ts
002_update_section_types.ts
003_add_income_tracking.ts
004_add_debt_tracking.ts        ← Only one 004 now
009_add_envelope_budgeting.ts   ← Renamed
005_add_household_invitation_codes.ts
006_add_assignment_transfers.ts
007_add_goal_contributions.ts
008_add_debt_payment_plans.ts
```

---

### Step 5: Rebuild Docker Container

**Option A: Zero-Downtime Deployment (Recommended)**

```bash
# Build new image (doesn't stop current container)
docker-compose build --no-cache node

# Quick restart (typically 5-10 seconds downtime)
docker-compose up -d --no-deps --force-recreate node
```

**Option B: Full Rebuild (30-60 seconds downtime)**

```bash
# Stop all containers
docker-compose down

# Rebuild node container with fresh dependencies
docker-compose build --no-cache node

# Start all services
docker-compose up -d
```

---

### Step 6: Verify Deployment

```bash
# Wait for services to start
sleep 10

# Check container status
docker-compose ps
# All containers should show "Up" status

# Check backend logs for errors
docker logs moneyshyft-node-1 --tail 50

# Look for these success messages:
# - "MoneyShyft API server running on 0.0.0.0:3000"
# - "Database: postgres:5432/moneyshyft"
# - No "Cannot find module" errors
# - No "relation does not exist" errors

# Verify migrations in database (should show 009_add_envelope_budgeting.ts)
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
SELECT name FROM knex_migrations WHERE name LIKE '009%' OR name LIKE '004%';
"

# Expected:
# 004_add_debt_tracking.ts
# 009_add_envelope_budgeting.ts

# Test signup endpoint
curl -X POST 'http://localhost:3000/api/v1/auth/signup' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "email": "deployment-test@example.com",
    "password": "Test12345",
    "firstName": "Deploy",
    "lastName": "Test",
    "householdName": "Test Household"
  }'

# Expected: JSON response with user object, no errors
```

---

### Step 7: Monitor Production

```bash
# Watch logs for 2-3 minutes to catch any issues
docker logs moneyshyft-node-1 -f

# Press Ctrl+C to stop watching

# Check nginx logs (on host since nginx runs outside Docker)
sudo tail -f /var/log/nginx/error.log

# Monitor for any 500 errors or database connection issues
```

---

## Handling Local Changes

If `git pull` fails due to local changes to `docker-compose.yml` or other environment-specific files:

```bash
# See what files have local changes
git status

# If it's docker-compose.yml (which is environment-specific):
# 1. Create a temporary backup
cp docker-compose.yml docker-compose.yml.backup

# 2. Pull changes
git pull origin main

# 3. If docker-compose.yml was overwritten, restore your backup
cp docker-compose.yml.backup docker-compose.yml

# 4. Verify your DATABASE_URL and other env vars are correct
cat docker-compose.yml | grep DATABASE_URL
```

---

## Rollback Procedure

If something goes wrong during deployment:

### Rollback Step 1: Revert Database Change

```bash
# Revert the migration name back
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "
UPDATE knex_migrations
SET name = '004_add_envelope_budgeting.ts'
WHERE name = '009_add_envelope_budgeting.ts';
"
```

### Rollback Step 2: Revert Git Changes

```bash
cd ~/moneyshyft

# Revert to previous commit (before the migration rename)
git revert ab97ea1 --no-edit

# Or reset to previous commit (destructive)
git reset --hard cc0ab7d  # The commit before the fix
```

### Rollback Step 3: Rebuild Container

```bash
docker-compose down
docker-compose build --no-cache node
docker-compose up -d
```

### Rollback Step 4: Restore from Backup (if needed)

**Only use if database corruption occurred:**

```bash
# Stop containers
docker-compose down

# Restore from backup
BACKUP_FILE=~/moneyshyft-backups/moneyshyft-YYYYMMDD-HHMMSS.sql
# (or .sql.gz if compressed)

# If compressed:
gunzip $BACKUP_FILE.gz

# Drop and recreate database
docker-compose up -d postgres
sleep 5
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -c "DROP DATABASE moneyshyft;"
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -c "CREATE DATABASE moneyshyft;"
docker exec -i moneyshyft-postgres-1 psql -U jeremiahotis moneyshyft < $BACKUP_FILE

# Restart all services
docker-compose up -d
```

---

## Success Criteria

Deployment is successful when:

- ✅ All Docker containers are running (`docker-compose ps` shows "Up" status)
- ✅ Backend logs show no errors
- ✅ Database query shows `009_add_envelope_budgeting.ts` (not `004_add_envelope_budgeting.ts`)
- ✅ Only ONE migration file with `004_` prefix exists in database
- ✅ Signup endpoint returns successful response (200 OK)
- ✅ No "relation does not exist" errors in logs
- ✅ No "Cannot find module" errors in logs

---

## Troubleshooting

### Issue: "Cannot find module 'bcryptjs'" error

**Solution:**
```bash
docker-compose down
docker-compose build --no-cache node
docker-compose up -d
```

### Issue: "relation 'users' does not exist" error

**Solution:**
```bash
# Check if migrations table exists
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "\dt"

# If users table is missing, restore from backup (see Rollback Step 4)

# If users table exists, restart backend
docker-compose restart node
```

### Issue: Signup endpoint returns 500 error

**Solution:**
```bash
# Check detailed error logs
docker logs moneyshyft-node-1 --tail 100

# Look for database connection errors
docker exec moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "SELECT 1;"

# Verify DATABASE_URL in container
docker exec moneyshyft-node-1 env | grep DATABASE_URL
```

### Issue: Container won't start

**Solution:**
```bash
# Check why it's failing
docker logs moneyshyft-node-1

# Check docker-compose.yml syntax
docker-compose config

# Verify environment variables are set
cat docker-compose.yml | grep -A 5 environment:
```

---

## Post-Deployment Tasks

- [ ] Test signup from production frontend (if deployed)
- [ ] Test login with existing user
- [ ] Check application logs for 24 hours
- [ ] Delete deployment test user: `deployment-test@example.com`
- [ ] Archive this deployment guide with timestamp
- [ ] Update team documentation with new migration numbering

---

## Important Notes

1. **This migration has already been applied** - We're only updating tracking metadata, not running new database changes
2. **Database data is safe** - The Docker rebuild preserves all data in the `postgres_data` volume
3. **Production `docker-compose.yml` is environment-specific** - Don't overwrite it from git
4. **Nginx runs on host** - It's not affected by this deployment
5. **Always backup first** - Even for "safe" deployments like this one

---

## Questions or Issues?

If you encounter any issues during deployment:

1. Check the "Troubleshooting" section above
2. Review the deployment logs carefully
3. Use the rollback procedure if needed
4. Verify the backup was created successfully before proceeding

**Remember:** It's always better to rollback and investigate than to force through issues.
