#!/usr/bin/env bash
set -euo pipefail

if node -e "const p=require('./package.json'); process.exit((p.scripts && p.scripts.lint) ? 0 : 1)"; then
  echo "Running lint script"
  npm run lint
  exit 0
fi

echo "No lint script found; running Playwright discovery fallback"
# Build shared libs first so app-local wrappers that target libs/dist resolve during
# Playwright test discovery in CI.
node scripts/build-shared-libs.mjs auth db http platform ui-shell
# Use direct Playwright discovery so lint CI does not require backend/frontend preflight.
NODE_ENV=test npx playwright test --list
