#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, 'docs/policies/project_lanes.json');

function run(command) {
  try {
    return childProcess.execSync(command, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_error) {
    return '';
  }
}

function runLines(command) {
  const output = run(command);
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function fail(message) {
  console.error(`Project lane guard failed: ${message}`);
  process.exit(1);
}

function normalizeRelative(filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized;
}

function parseArgs(argv) {
  const args = { lane: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--lane') {
      const value = argv[i + 1] || '';
      if (!value || value.startsWith('--')) {
        fail('missing value for --lane');
      }
      args.lane = value.trim().toLowerCase();
      i += 1;
      continue;
    }
    if (token === '-h' || token === '--help') {
      process.stdout.write(
        'Usage: node scripts/enforce-project-lane.js [--lane <lane-id>]\n'
      );
      process.exit(0);
    }
    fail(`unknown argument '${token}'`);
  }
  return args;
}

function loadLaneConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing lane config file: ${path.relative(repoRoot, filePath)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`could not parse lane config file: ${error.message}`);
  }

  if (!parsed || !Array.isArray(parsed.lanes) || parsed.lanes.length === 0) {
    fail('lane config must define a non-empty "lanes" array');
  }

  const laneIds = new Set();
  for (const lane of parsed.lanes) {
    if (!lane || typeof lane.id !== 'string' || lane.id.trim() === '') {
      fail('each lane entry must define a non-empty "id"');
    }
    const id = lane.id.trim().toLowerCase();
    if (laneIds.has(id)) {
      fail(`duplicate lane id detected: ${id}`);
    }
    laneIds.add(id);
    lane.id = id;
    lane.branchTokens = Array.isArray(lane.branchTokens) ? lane.branchTokens : [];
    lane.planningFilenameTokens = Array.isArray(lane.planningFilenameTokens)
      ? lane.planningFilenameTokens
      : [];
    if (typeof lane.sprintStatusFile !== 'string' || lane.sprintStatusFile.trim() === '') {
      fail(`lane '${id}' must define sprintStatusFile`);
    }
    lane.sprintStatusFile = normalizeRelative(lane.sprintStatusFile.trim());
  }

  const defaultLane = (parsed.defaultLane || '').toLowerCase().trim();
  if (!defaultLane) {
    fail('lane config must define defaultLane');
  }
  if (!laneIds.has(defaultLane)) {
    fail(`defaultLane '${defaultLane}' is not present in lanes[]`);
  }

  const planningRules = parsed.planningRules || {};
  const planningDir = normalizeRelative(
    String(planningRules.planningDir || '_bmad-output/planning-artifacts').trim()
  );
  const rootPlanningMarkdownDir = normalizeRelative(
    String(planningRules.rootPlanningMarkdownDir || '_bmad-output').trim()
  );

  return {
    defaultLane,
    lanes: parsed.lanes,
    planningDir,
    rootPlanningMarkdownDir,
  };
}

function resolveBranchName() {
  const fromEnv = process.env.GITHUB_HEAD_REF || '';
  if (fromEnv) {
    return fromEnv.trim();
  }
  const symbolic = run('git symbolic-ref --quiet --short HEAD');
  if (symbolic && symbolic !== 'HEAD') {
    return symbolic;
  }
  const abbrev = run('git rev-parse --abbrev-ref HEAD');
  if (abbrev && abbrev !== 'HEAD') {
    return abbrev;
  }
  return 'detached';
}

function resolveActiveLane(config, requestedLane, branchName) {
  if (requestedLane) {
    const match = config.lanes.find((lane) => lane.id === requestedLane);
    if (!match) {
      fail(`unknown lane '${requestedLane}' from --lane/PROJECT_LANE`);
    }
    return match.id;
  }

  const lowerBranch = branchName.toLowerCase();
  const matched = new Set();
  for (const lane of config.lanes) {
    for (const rawToken of lane.branchTokens) {
      const token = String(rawToken || '').toLowerCase().trim();
      if (!token) {
        continue;
      }
      if (lowerBranch.includes(token)) {
        matched.add(lane.id);
      }
    }
  }

  if (matched.size > 1) {
    fail(`branch '${branchName}' matches multiple lanes: ${Array.from(matched).join(', ')}`);
  }
  if (matched.size === 1) {
    return Array.from(matched)[0];
  }
  return config.defaultLane;
}

function gatherChangedFiles() {
  const changed = new Set();

  const add = (list) => {
    for (const file of list) {
      changed.add(normalizeRelative(file));
    }
  };

  const workingTree = runLines('git diff --name-only --diff-filter=AM');
  const staged = runLines('git diff --cached --name-only --diff-filter=AM');
  const untracked = runLines('git ls-files --others --exclude-standard');

  add(workingTree);
  add(staged);
  add(untracked);

  const hasLocalChanges = workingTree.length > 0 || staged.length > 0 || untracked.length > 0;
  if (!hasLocalChanges) {
    const baseRef = (process.env.GITHUB_BASE_REF || '').trim();
    if (baseRef && run(`git rev-parse --verify --quiet origin/${baseRef}`)) {
      add(runLines(`git diff --name-only --diff-filter=AM origin/${baseRef}...HEAD`));
    } else if (run('git rev-parse --verify --quiet HEAD~1')) {
      add(runLines('git diff --name-only --diff-filter=AM HEAD~1...HEAD'));
    }
  }

  return Array.from(changed).filter((file) => file.length > 0);
}

function isPlanningArtifact(config, relativePath) {
  if (relativePath.endsWith('.DS_Store')) {
    return false;
  }

  const planningPrefix = `${config.planningDir}/`;
  if (relativePath.startsWith(planningPrefix)) {
    return true;
  }

  const rootPrefix = `${config.rootPlanningMarkdownDir}/`;
  if (!relativePath.startsWith(rootPrefix)) {
    return false;
  }

  const rest = relativePath.slice(rootPrefix.length);
  if (rest.includes('/')) {
    return false;
  }

  return /\.(md|markdown)$/i.test(relativePath);
}

function inferPlanningLane(config, relativePath) {
  const lowerBase = path.basename(relativePath).toLowerCase();
  const matches = [];

  for (const lane of config.lanes) {
    for (const rawToken of lane.planningFilenameTokens) {
      const token = String(rawToken || '').toLowerCase().trim();
      if (!token) {
        continue;
      }
      if (lowerBase.includes(token)) {
        matches.push(lane.id);
        break;
      }
    }
  }

  const unique = Array.from(new Set(matches));
  if (unique.length > 1) {
    fail(`planning artifact '${relativePath}' matches multiple lanes: ${unique.join(', ')}`);
  }
  if (unique.length === 1) {
    return unique[0];
  }
  return config.defaultLane;
}

function extractProjectLaneMetadata(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^\s*project_lane\s*:\s*([A-Za-z0-9_-]+)\s*$/im);
  if (!match) {
    return '';
  }
  return match[1].trim().toLowerCase();
}

function isMetadataRequired(filePath) {
  return /\.(md|markdown|ya?ml)$/i.test(filePath);
}

function validateSprintStatusMetadata(config) {
  const issues = [];
  for (const lane of config.lanes) {
    const absolute = path.join(repoRoot, lane.sprintStatusFile);
    if (!fs.existsSync(absolute)) {
      issues.push(`missing sprint status file for lane '${lane.id}': ${lane.sprintStatusFile}`);
      continue;
    }
    const metadataLane = extractProjectLaneMetadata(absolute);
    if (!metadataLane) {
      issues.push(`missing project_lane metadata in ${lane.sprintStatusFile}`);
      continue;
    }
    if (metadataLane !== lane.id) {
      issues.push(
        `project_lane mismatch in ${lane.sprintStatusFile}: expected '${lane.id}', found '${metadataLane}'`
      );
    }
  }
  return issues;
}

function main() {
  if (!run('git rev-parse --is-inside-work-tree')) {
    fail('not inside a git repository');
  }

  const args = parseArgs(process.argv);
  const config = loadLaneConfig(configPath);
  const branch = resolveBranchName();
  const requestedLane = (args.lane || process.env.PROJECT_LANE || '').trim().toLowerCase();
  const activeLane = resolveActiveLane(config, requestedLane, branch);
  const changedFiles = gatherChangedFiles();

  const metadataIssues = validateSprintStatusMetadata(config);
  if (metadataIssues.length > 0) {
    fail(metadataIssues.join('\n'));
  }

  const planningFiles = changedFiles.filter((file) => isPlanningArtifact(config, file));
  if (planningFiles.length === 0) {
    console.log(
      `Project lane guard passed (lane=${activeLane}, no changed planning artifacts)`
    );
    return;
  }

  const issues = [];
  for (const relativePath of planningFiles) {
    const expectedLane = inferPlanningLane(config, relativePath);
    if (expectedLane !== activeLane) {
      issues.push(
        `planning artifact lane mismatch: ${relativePath} belongs to '${expectedLane}' but active lane is '${activeLane}'`
      );
      continue;
    }

    if (!isMetadataRequired(relativePath)) {
      continue;
    }

    const absolute = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    const metadataLane = extractProjectLaneMetadata(absolute);
    if (!metadataLane) {
      issues.push(`missing 'project_lane:' metadata in ${relativePath}`);
      continue;
    }
    if (metadataLane !== expectedLane) {
      issues.push(
        `project_lane metadata mismatch in ${relativePath}: expected '${expectedLane}', found '${metadataLane}'`
      );
    }
  }

  if (issues.length > 0) {
    fail(issues.join('\n'));
  }

  console.log(
    `Project lane guard passed (lane=${activeLane}, planning files validated=${planningFiles.length})`
  );
}

main();
