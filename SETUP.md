# MoneyShyft Setup Guide

## Local Development Setup

### 1. Create your local docker-compose.yml

Copy the example file and customize for your local environment:

```bash
cp docker-compose.example.yml docker-compose.yml
```

Then edit `docker-compose.yml` and update:
- Database username and password
- JWT secrets (generate strong random strings)
- Any other environment-specific settings

**Important**: `docker-compose.yml` is in `.gitignore` and should NEVER be committed to git.

### 2. Remote Server Deployment

On the remote server:
- Nginx runs directly on the host (not containerized)
- Docker Compose only runs `postgres` and `node` services
- Create a separate `docker-compose.yml` configured for production

### 3. Environment Files

The `.env` file in `src/` contains configuration. For production:
- Use strong, unique passwords
- Generate secure JWT secrets: `openssl rand -base64 32`
- Never commit `.env` files to git

## Security Notes

- All credentials should be unique per environment
- The `.gitignore` file prevents sensitive files from being committed
- Always use environment variables for secrets in production

## QA Regression (Playwright)

Playwright tests run against a live app. Set these env vars before running:

```bash
export BASE_URL=http://localhost:5173
export TEST_EMAIL=you@example.com
export TEST_PASSWORD=yourpassword
```

Run the suite:

```bash
npx playwright test
```

CI uses the same variables via GitHub Secrets:
- `STAGING_URL` (mapped to `BASE_URL`)
- `TEST_EMAIL`
- `TEST_PASSWORD`

## Admin Utilities

Reset household data (keeps users + household, clears everything else and resets wizard):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-reset-token: <RESET_TOKEN>" \
  -b "access_token=<cookie>" \
  -d '{"confirm":"RESET","resetToken":"<RESET_TOKEN>"}' \
  https://<your-domain>/api/v1/households/reset
```

Notes:
- Requires an authenticated session plus `RESET_TOKEN` (set in the server environment).
- This is destructive and intended for recovery/testing workflows.
