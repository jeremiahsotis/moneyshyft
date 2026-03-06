#!/usr/bin/env bash
set -euo pipefail

if node -e "const p=require('./package.json'); process.exit((p.scripts && p.scripts.lint) ? 0 : 1)"; then
  echo "Running lint script"
  npm run lint
  exit 0
fi

echo "No lint script found; running Playwright discovery fallback"
npm run test:e2e -- --list
