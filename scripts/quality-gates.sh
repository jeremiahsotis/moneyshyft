#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const fs = require('fs');
const path = require('path');

const roots = [
  path.resolve('tests/artifacts/test-results'),
  path.resolve('tests/artifacts/gates'),
];

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function collectSpecsFromSuite(suite, acc) {
  if (suite.specs) acc.push(...suite.specs);
  if (suite.suites) suite.suites.forEach((child) => collectSpecsFromSuite(child, acc));
}

const files = roots.flatMap((dir) => listJsonFiles(dir)).filter((file) => file.endsWith('.json'));
if (files.length === 0) {
  console.error('Quality gates failed: no JSON results found in tests/artifacts/test-results or tests/artifacts/gates');
  process.exit(1);
}

let p0Total = 0;
let p0Pass = 0;
let p1Total = 0;
let p1Pass = 0;

for (const file of files) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    continue;
  }

  const specs = [];
  (json.suites || []).forEach((s) => collectSpecsFromSuite(s, specs));

  for (const spec of specs) {
    const title = spec.title || '';
    const tags = new Set((spec.tags || []).map((t) => String(t).replace(/^@/, '').toUpperCase()));
    if (title.includes('@P0')) tags.add('P0');
    if (title.includes('@P1')) tags.add('P1');

    const tests = spec.tests || [];
    const passed = tests.length > 0 && tests.every((t) => t.status === 'passed');

    if (tags.has('P0')) {
      p0Total += 1;
      if (passed) p0Pass += 1;
    }
    if (tags.has('P1')) {
      p1Total += 1;
      if (passed) p1Pass += 1;
    }
  }
}

const p0Rate = p0Total === 0 ? null : (p0Pass / p0Total) * 100;
const p1Rate = p1Total === 0 ? null : (p1Pass / p1Total) * 100;

console.log(`P0 tagged tests: ${p0Total}`);
console.log(`P1 tagged tests: ${p1Total}`);
if (p0Rate !== null) console.log(`P0 pass rate: ${p0Rate.toFixed(2)}%`);
if (p1Rate !== null) console.log(`P1 pass rate: ${p1Rate.toFixed(2)}%`);

if (p0Total > 0 && p0Rate < 100) {
  console.error('Quality gate failed: @P0 pass rate must be 100%');
  process.exit(1);
}
if (p1Total > 0 && p1Rate < 95) {
  console.error('Quality gate failed: @P1 pass rate must be >=95%');
  process.exit(1);
}

if (p0Total === 0) console.log('Skipping @P0 gate: no tagged tests found');
if (p1Total === 0) console.log('Skipping @P1 gate: no tagged tests found');
console.log('Quality gates passed');
NODE
