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

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function extractTags(spec) {
  const title = spec.title || '';
  const tags = new Set((spec.tags || []).map((t) => String(t).replace(/^@/, '').toUpperCase()));
  if (title.includes('@P0')) tags.add('P0');
  if (title.includes('@P1')) tags.add('P1');
  return tags;
}

function classifyTestOutcome(test) {
  const testStatus = normalizeStatus(test?.status);
  const resultStatuses = Array.isArray(test?.results)
    ? test.results.map((result) => normalizeStatus(result?.status)).filter(Boolean)
    : [];

  const hasExecutedResult = resultStatuses.some((status) => status !== 'skipped');
  const hasFailResult = resultStatuses.some((status) => status === 'failed' || status === 'timedout' || status === 'interrupted');
  const hasPassResult = resultStatuses.some((status) => status === 'passed');

  if (testStatus === 'flaky' || testStatus === 'failed' || testStatus === 'unexpected' || testStatus === 'timedout') {
    return { executed: true, passed: false, failed: true };
  }

  if (testStatus === 'skipped' && !hasExecutedResult) {
    return { executed: false, passed: false, failed: false };
  }

  if (hasFailResult) {
    return { executed: true, passed: false, failed: true };
  }

  if (testStatus === 'expected' || testStatus === 'passed' || hasPassResult) {
    return { executed: hasExecutedResult || testStatus === 'expected' || testStatus === 'passed', passed: true, failed: false };
  }

  if (hasExecutedResult) {
    return { executed: true, passed: false, failed: true };
  }

  return { executed: false, passed: false, failed: false };
}

function buildSpecTestKey(spec, test, testIndex) {
  const specKey = spec.id
    ? `id:${spec.id}`
    : [spec.file || 'unknown', spec.line || 0, spec.column || 0, spec.title || ''].join(':');
  const projectKey = test?.projectName || test?.projectId || `test-${testIndex}`;
  return `${specKey}::${projectKey}`;
}

const files = roots.flatMap((dir) => listJsonFiles(dir)).filter((file) => file.endsWith('.json'));
if (files.length === 0) {
  console.error('Quality gates failed: no JSON results found in tests/artifacts/test-results or tests/artifacts/gates');
  process.exit(1);
}

const shardSnapshotFiles = files.filter((file) => /[\\/]gates[\\/]results-shard-\d+\.json$/i.test(file));
const inputFiles = shardSnapshotFiles.length > 0 ? shardSnapshotFiles : files;

const observationsByTest = new Map();
let parsedPlaywrightFiles = 0;
let skippedUnreadableFiles = 0;

let p0Total = 0;
let p0Pass = 0;
let p1Total = 0;
let p1Pass = 0;

for (const file of inputFiles) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    skippedUnreadableFiles += 1;
    continue;
  }

  if (!Array.isArray(json.suites)) {
    continue;
  }

  parsedPlaywrightFiles += 1;
  const specs = [];
  json.suites.forEach((suite) => collectSpecsFromSuite(suite, specs));

  for (const spec of specs) {
    const tags = extractTags(spec);
    if (!tags.has('P0') && !tags.has('P1')) {
      continue;
    }

    const tests = spec.tests || [];
    tests.forEach((test, testIndex) => {
      const key = buildSpecTestKey(spec, test, testIndex);
      const prior = observationsByTest.get(key) || {
        tags: new Set(),
        observations: [],
      };
      prior.tags = new Set([...prior.tags, ...tags]);
      prior.observations.push(classifyTestOutcome(test));
      observationsByTest.set(key, prior);
    });
  }
}

if (parsedPlaywrightFiles === 0) {
  console.error('Quality gates failed: no Playwright JSON suites found in test artifacts');
  process.exit(1);
}

for (const value of observationsByTest.values()) {
  const executed = value.observations.some((observation) => observation.executed);
  if (!executed) {
    continue;
  }

  const failed = value.observations.some((observation) => observation.failed);
  const passed = !failed && value.observations.some((observation) => observation.passed);

  if (value.tags.has('P0')) {
      p0Total += 1;
      if (passed) p0Pass += 1;
  }
  if (value.tags.has('P1')) {
      p1Total += 1;
      if (passed) p1Pass += 1;
  }
}

const p0Rate = p0Total === 0 ? null : (p0Pass / p0Total) * 100;
const p1Rate = p1Total === 0 ? null : (p1Pass / p1Total) * 100;

if (skippedUnreadableFiles > 0) {
  console.log(`Skipped unreadable JSON files: ${skippedUnreadableFiles}`);
}
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
