#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  '_bmad-output/planning-artifacts/epic-0-phase-0-kernel-story-set.md',
  '_bmad-output/implementation-artifacts/sprint-status.yaml',
  '_bmad-output/test-artifacts/test-design-epic-0.md',
  'docs/policies/git_policy.md',
];

const storyKeys = [
  '0-1-canonical-app-entrypoint-and-platform-middleware-chain',
  '0-2-tenancy-context-resolution-and-repository-enforcement',
  '0-3-platform-session-store-and-refresh-rotation',
  '0-4-csrf-and-parent-domain-cookie-enforcement',
  '0-5-shared-api-envelope-and-business-refusal-contract',
  '0-6-platform-events-and-outbox-schema-foundations',
  '0-7-mutation-transaction-wrapper-with-mandatory-event-outbox-writes',
  '0-8-centralized-time-service-and-utc-local-rendering-contract',
  '0-9-ci-policy-gate-as-blocking-first-stage',
  '0-10-kernel-readiness-verification-suite',
];

const allowedStoryStates = new Set(['ready-for-dev', 'in-progress', 'review', 'done']);
const allowedEpicStates = new Set(['in-progress', 'done']);

const failures = [];
const warnings = [];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) failures.push(`Missing required file: ${rel}`);
}

for (const key of storyKeys) {
  const rel = `_bmad-output/implementation-artifacts/${key}.md`;
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) failures.push(`Missing Epic 0 story file: ${rel}`);
}

const statusPath = path.join(root, '_bmad-output/implementation-artifacts/sprint-status.yaml');
const statuses = new Map();
if (fs.existsSync(statusPath)) {
  const lines = fs.readFileSync(statusPath, 'utf8').split(/\r?\n/);
  let inSection = false;
  for (const line of lines) {
    if (/^development_status:\s*$/.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s{2}([a-z0-9-]+):\s*([a-z-]+)\s*$/);
    if (m) statuses.set(m[1], m[2]);
  }
}

const epicState = statuses.get('epic-0');
if (!epicState) {
  failures.push('Missing sprint status entry: epic-0');
} else if (!allowedEpicStates.has(epicState)) {
  failures.push(`Invalid epic-0 state: ${epicState} (expected in-progress|done)`);
}

for (const key of storyKeys) {
  const state = statuses.get(key);
  if (!state) {
    failures.push(`Missing sprint status entry: ${key}`);
    continue;
  }
  if (!allowedStoryStates.has(state)) {
    failures.push(`Invalid story state for ${key}: ${state}`);
  }
}

const gateDir = path.join(root, 'tests/artifacts/gates');
fs.mkdirSync(gateDir, { recursive: true });
const report = {
  timestamp_utc: new Date().toISOString(),
  gate: 'epic-0-quality',
  pass: failures.length === 0,
  failure_count: failures.length,
  warning_count: warnings.length,
  failures,
  warnings,
};
fs.writeFileSync(path.join(gateDir, 'epic-0-quality.json'), JSON.stringify(report, null, 2));

if (warnings.length) {
  console.log('Epic 0 quality warnings:');
  warnings.forEach((w) => console.log(`- ${w}`));
}

if (failures.length) {
  console.error('Epic 0 quality gate failed:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log('Epic 0 quality gate passed');
NODE
