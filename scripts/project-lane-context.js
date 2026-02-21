#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function fail(message) {
  process.stderr.write(`Project lane context failed: ${message}\n`);
  process.exit(1);
}

function normalizeLaneId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSlugToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-');
}

function parseArgs(argv) {
  const args = {
    lane: '',
    branch: '',
    format: 'json',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--lane') {
      const value = argv[i + 1] || '';
      if (!value || value.startsWith('--')) {
        fail('missing value for --lane');
      }
      args.lane = normalizeLaneId(value);
      i += 1;
      continue;
    }
    if (token === '--branch') {
      const value = argv[i + 1] || '';
      if (!value || value.startsWith('--')) {
        fail('missing value for --branch');
      }
      args.branch = String(value).trim();
      i += 1;
      continue;
    }
    if (token === '--format') {
      const value = argv[i + 1] || '';
      if (!value || value.startsWith('--')) {
        fail('missing value for --format');
      }
      const format = String(value).trim().toLowerCase();
      if (format !== 'json' && format !== 'shell') {
        fail(`unsupported format '${value}'`);
      }
      args.format = format;
      i += 1;
      continue;
    }
    if (token === '-h' || token === '--help') {
      process.stdout.write(
        'Usage: node scripts/project-lane-context.js [--lane <lane-id>] [--branch <branch>] [--format json|shell]\n'
      );
      process.exit(0);
    }
    fail(`unknown argument '${token}'`);
  }

  return args;
}

function loadConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'docs/policies/project_lanes.json');
  if (!fs.existsSync(configPath)) {
    fail(`missing config file: ${path.relative(repoRoot, configPath)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    fail(`could not parse config file: ${error.message}`);
  }

  if (!parsed || !Array.isArray(parsed.lanes) || parsed.lanes.length === 0) {
    fail('config must define a non-empty "lanes" array');
  }

  const lanes = [];
  const laneById = new Map();
  for (const rawLane of parsed.lanes) {
    const id = normalizeLaneId(rawLane && rawLane.id);
    if (!id) {
      fail('each lane must define a non-empty "id"');
    }
    if (laneById.has(id)) {
      fail(`duplicate lane id '${id}'`);
    }
    const sprintStatusFile = String(rawLane.sprintStatusFile || '').trim();
    if (!sprintStatusFile) {
      fail(`lane '${id}' is missing sprintStatusFile`);
    }
    const branchTokens = Array.isArray(rawLane.branchTokens)
      ? rawLane.branchTokens.map((token) => normalizeLaneId(token)).filter(Boolean)
      : [];

    const lane = {
      id,
      sprintStatusFile: sprintStatusFile.replace(/\\/g, '/').replace(/^\.\//, ''),
      branchTokens,
    };
    lanes.push(lane);
    laneById.set(id, lane);
  }

  const defaultLane = normalizeLaneId(parsed.defaultLane);
  if (!defaultLane) {
    fail('config must define defaultLane');
  }
  if (!laneById.has(defaultLane)) {
    fail(`defaultLane '${defaultLane}' is not present in lanes[]`);
  }

  return {
    lanes,
    laneById,
    defaultLane,
  };
}

function normalizeRelativePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function inferLaneFromBranch(config, branch) {
  const normalizedBranch = normalizeLaneId(branch);
  if (!normalizedBranch) {
    return '';
  }
  const matched = new Set();
  for (const lane of config.lanes) {
    for (const token of lane.branchTokens) {
      if (!token) {
        continue;
      }
      if (normalizedBranch.includes(token)) {
        matched.add(lane.id);
      }
    }
  }
  if (matched.size > 1) {
    fail(
      `branch '${branch}' matches multiple lanes: ${Array.from(matched)
        .sort()
        .join(', ')}`
    );
  }
  if (matched.size === 1) {
    return Array.from(matched)[0];
  }
  return '';
}

function inferLaneFromSprintStatus(config, repoRoot, statusFilePath) {
  const candidateRaw = normalizeRelativePath(statusFilePath);
  if (!candidateRaw) {
    return '';
  }
  const candidateAbsolute = path.resolve(path.isAbsolute(candidateRaw) ? candidateRaw : path.join(repoRoot, candidateRaw));
  const matches = config.lanes.filter((lane) => {
    const laneAbsolute = path.resolve(repoRoot, lane.sprintStatusFile);
    return laneAbsolute === candidateAbsolute;
  });

  if (matches.length > 1) {
    fail(
      `sprint status file '${statusFilePath}' matches multiple lanes: ${matches
        .map((lane) => lane.id)
        .join(', ')}`
    );
  }
  if (matches.length === 1) {
    return matches[0].id;
  }
  return '';
}

function resolveLane(config, args) {
  const envLane = normalizeLaneId(process.env.PROJECT_LANE || '');
  const requestedLane = normalizeLaneId(args.lane || envLane);
  if (requestedLane) {
    const lane = config.laneById.get(requestedLane);
    if (!lane) {
      fail(`unknown lane '${requestedLane}'`);
    }
    return {
      lane,
      source: args.lane ? 'arg' : 'env',
    };
  }

  const inferredLaneId = inferLaneFromBranch(config, args.branch || '');
  if (inferredLaneId) {
    return {
      lane: config.laneById.get(inferredLaneId),
      source: 'branch',
    };
  }

  const sprintStatusLaneId = inferLaneFromSprintStatus(
    config,
    process.cwd(),
    process.env.SPRINT_STATUS_FILE || ''
  );
  if (sprintStatusLaneId) {
    return {
      lane: config.laneById.get(sprintStatusLaneId),
      source: 'sprint-status-file',
    };
  }

  return {
    lane: config.laneById.get(config.defaultLane),
    source: 'default',
  };
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function printShell(payload) {
  const lines = [
    `ACTIVE_LANE=${shQuote(payload.activeLane)}`,
    `DEFAULT_LANE=${shQuote(payload.defaultLane)}`,
    `LANE_SOURCE=${shQuote(payload.source)}`,
    `LANE_SLUG_TOKEN=${shQuote(payload.slugToken)}`,
    `LANE_SPRINT_STATUS_FILE=${shQuote(payload.sprintStatusFile)}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv);
  const config = loadConfig(repoRoot);
  const { lane, source } = resolveLane(config, args);
  const slugToken = normalizeSlugToken(lane.id);
  if (!slugToken) {
    fail(`lane '${lane.id}' produced an empty slug token`);
  }

  const payload = {
    activeLane: lane.id,
    defaultLane: config.defaultLane,
    source,
    slugToken,
    sprintStatusFile: lane.sprintStatusFile,
  };

  if (args.format === 'shell') {
    printShell(payload);
    return;
  }

  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

main();
