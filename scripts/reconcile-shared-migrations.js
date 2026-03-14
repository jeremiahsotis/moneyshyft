#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const args = process.argv.slice(2);

const SOURCE_PATHS = {
  admin: path.join(cwd, 'apps/admin-api/src/migrations'),
  money: path.join(cwd, 'apps/moneyshyft-api/src/migrations'),
  connect: path.join(cwd, 'apps/connectshyft-api/src/migrations'),
  shared: path.join(cwd, 'shared/database/migrations'),
};

const OVERRIDES_PATH = path.join(
  cwd,
  'shared/database/reconciliation/migration-manifest-overrides.json'
);

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function hasArg(name) {
  return args.includes(name);
}

function toLogicalId(fileName) {
  return fileName.replace(/\.(ts|js)$/, '');
}

function toCanonicalProductionFileName(logicalId) {
  return `${logicalId}.js`;
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

function readMigrationArtifacts(location, directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((fileName) => /\.(ts|js)$/.test(fileName))
    .sort()
    .map((fileName) => {
      const absolutePath = path.join(directory, fileName);
      return {
        logicalId: toLogicalId(fileName),
        fileName,
        location,
        absolutePath,
        extension: path.extname(fileName).slice(1),
      };
    });
}

function readOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return {};
  }

  const parsed = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  const overrides = {};

  for (const [canonicalProductionFileName, value] of Object.entries(parsed)) {
    const logicalId = value.logicalId || toLogicalId(canonicalProductionFileName);
    overrides[canonicalProductionFileName] = {
      canonicalProductionFileName,
      logicalId,
      manualHotfixVerified: value.manualHotfixVerified === true,
      inspectionRequired: value.inspectionRequired === true,
      note: typeof value.note === 'string' ? value.note : '',
    };
  }

  return overrides;
}

async function loadPgClient() {
  const candidates = [
    'pg',
    path.join(cwd, 'node_modules/pg'),
    path.join(cwd, 'apps/admin-api/node_modules/pg'),
    path.join(cwd, 'apps/moneyshyft-api/node_modules/pg'),
    path.join(cwd, 'apps/connectshyft-api/node_modules/pg'),
  ];

  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const mod = require(candidate);
      if (mod && typeof mod.Client === 'function') {
        return mod.Client;
      }
    } catch (error) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  throw new Error(
    'pg is required only for DB-backed reconciliation, but no pg module could be resolved from the repository.'
  );
}

async function loadLedgerRows(connectionString) {
  const Client = await loadPgClient();
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(`
      select name, batch, migration_time
      from public.knex_migrations
      order by id asc
    `);

    return result.rows.map((row) => ({
      logicalId: toLogicalId(row.name),
      ledgerName: row.name,
      batch: row.batch,
      migrationTime: row.migration_time,
    }));
  } finally {
    await client.end();
  }
}

function addArtifact(rowMap, artifact) {
  const existing = getOrCreateRow(rowMap, artifact.logicalId);

  if (existing.sourceFiles[artifact.location]) {
    throw new Error(
      `Duplicate migration artifact for ${artifact.location}:${artifact.logicalId} (${existing.sourceFiles[artifact.location]} and ${artifact.fileName})`
    );
  }

  existing.sourceFiles[artifact.location] = artifact.fileName;
  existing.absolutePaths[artifact.location] = artifact.absolutePath;
}

function createRow(logicalId) {
  const canonicalProductionFileName = toCanonicalProductionFileName(logicalId);
  return {
    logicalId,
    canonicalProductionFileName,
    sourceFiles: {
      admin: null,
      money: null,
      connect: null,
      shared: null,
    },
    absolutePaths: {
      admin: null,
      money: null,
      connect: null,
      shared: null,
    },
    recordedInProduction: false,
    recordedLedgerName: null,
    ledgerBatch: null,
    ledgerMigrationTime: null,
    manualHotfixVerified: false,
    inspectionRequired: false,
    overrideApplied: false,
    overrideNote: '',
    classification: 'blocked',
    markAppliedSqlSuggestion: null,
  };
}

function getOrCreateRow(rowMap, logicalId) {
  if (!rowMap.has(logicalId)) {
    rowMap.set(logicalId, createRow(logicalId));
  }
  return rowMap.get(logicalId);
}

function attachLedgerRecord(row, ledgerRecord) {
  row.recordedInProduction = true;
  row.recordedLedgerName = ledgerRecord.ledgerName;
  row.ledgerBatch = ledgerRecord.batch;
  row.ledgerMigrationTime = ledgerRecord.migrationTime;
}

function attachOverride(row, override) {
  row.manualHotfixVerified = override.manualHotfixVerified;
  row.inspectionRequired = override.inspectionRequired;
  row.overrideApplied = true;
  row.overrideNote = override.note;
}

function classifyRow(row) {
  const apiPresenceCount = ['admin', 'money', 'connect'].filter(
    (location) => row.sourceFiles[location]
  ).length;
  const presentInSource = apiPresenceCount > 0 || Boolean(row.sourceFiles.shared);

  if (row.inspectionRequired && !row.recordedInProduction) {
    return 'blocked';
  }

  if (row.manualHotfixVerified && !row.recordedInProduction) {
    return 'manual_hotfix_needs_mark_applied';
  }

  if (row.recordedInProduction && !presentInSource) {
    return 'recorded_but_missing_from_source';
  }

  if (row.recordedInProduction && presentInSource) {
    return 'recorded_and_present';
  }

  if (row.sourceFiles.shared) {
    return 'ready_to_run';
  }

  if (apiPresenceCount > 1) {
    return 'duplicate_across_apis';
  }

  if (apiPresenceCount >= 1) {
    return 'ready_to_promote_to_shared';
  }

  return 'blocked';
}

function buildMarkAppliedSqlSuggestion(row) {
  const escapedName = escapeSqlLiteral(row.canonicalProductionFileName);

  return `-- suggestion only; do not execute automatically\ninsert into public.knex_migrations (name, batch, migration_time)
select
  '${escapedName}',
  coalesce((select max(batch) from public.knex_migrations), 0) + 1,
  now()
where not exists (
  select 1 from public.knex_migrations where name = '${escapedName}'
);`;
}

function finalizeRows(rowMap, overrides) {
  const rows = [...rowMap.values()]
    .sort((left, right) => left.logicalId.localeCompare(right.logicalId))
    .map((row) => {
      const override = overrides[row.canonicalProductionFileName];
      if (override) {
        attachOverride(row, override);
      }

      row.classification = classifyRow(row);
      if (row.classification === 'manual_hotfix_needs_mark_applied') {
        row.markAppliedSqlSuggestion = buildMarkAppliedSqlSuggestion(row);
      }

      return row;
    });

  return rows;
}

function summarizeRows(rows) {
  const counts = {};
  for (const row of rows) {
    counts[row.classification] = (counts[row.classification] || 0) + 1;
  }
  return counts;
}

function normalizeFailStates(rawValue) {
  if (!rawValue) {
    return [];
  }
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function renderValue(value) {
  return value == null ? '' : String(value);
}

function renderTable(rows) {
  const headers = [
    'logicalId',
    'adminFileName',
    'moneyFileName',
    'connectFileName',
    'sharedFileName',
    'recordedLedgerName',
    'classification',
  ];

  const values = rows.map((row) => [
    row.logicalId,
    row.sourceFiles.admin,
    row.sourceFiles.money,
    row.sourceFiles.connect,
    row.sourceFiles.shared,
    row.recordedLedgerName,
    row.classification,
  ]);

  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...values.map((row) => renderValue(row[index]).length)
    )
  );

  const renderLine = (line) =>
    line.map((value, index) => renderValue(value).padEnd(widths[index])).join(' | ');

  console.log(renderLine(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('-|-'));
  values.forEach((line) => console.log(renderLine(line)));
}

function renderMarkdown(rows) {
  console.log(
    '| logicalId | adminFileName | moneyFileName | connectFileName | sharedFileName | recordedLedgerName | classification |'
  );
  console.log('|---|---|---|---|---|---|---|');

  for (const row of rows) {
    console.log(
      `| ${renderValue(row.logicalId)} | ${renderValue(row.sourceFiles.admin)} | ${renderValue(row.sourceFiles.money)} | ${renderValue(row.sourceFiles.connect)} | ${renderValue(row.sourceFiles.shared)} | ${renderValue(row.recordedLedgerName)} | ${renderValue(row.classification)} |`
    );
  }
}

function renderJson(rows, metadata) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        format: 'json',
        metadata,
        summary: summarizeRows(rows),
        rows,
      },
      null,
      2
    )
  );
}

function renderSuggestionSections(rows) {
  const manualHotfixRows = rows.filter(
    (row) => row.classification === 'manual_hotfix_needs_mark_applied'
  );

  if (manualHotfixRows.length === 0) {
    return;
  }

  console.log('\nManual hotfix migrations that need mark-applied SQL suggestions:\n');
  for (const row of manualHotfixRows) {
    console.log(`# ${row.canonicalProductionFileName}`);
    console.log(row.markAppliedSqlSuggestion);
    console.log('');
  }
}

function maybeFailOnStates(rows, failOnStates) {
  if (failOnStates.length === 0) {
    return;
  }

  const matchedRows = rows.filter((row) => failOnStates.includes(row.classification));
  if (matchedRows.length === 0) {
    return;
  }

  console.error(
    `Reconciliation guard failed for classifications: ${failOnStates.join(', ')}`
  );
  for (const row of matchedRows) {
    console.error(`- ${row.logicalId}: ${row.classification}`);
  }
  process.exit(2);
}

async function main() {
  const format = argValue('--format') || 'table';
  const dbUrl = argValue('--db') || process.env.DATABASE_URL;
  const failOnStates = normalizeFailStates(argValue('--fail-on-states'));

  if (!['table', 'markdown', 'json'].includes(format)) {
    throw new Error(`Unsupported --format value '${format}'. Expected table, markdown, or json.`);
  }

  const overrides = readOverrides();
  const rowMap = new Map();

  for (const [location, directory] of Object.entries(SOURCE_PATHS)) {
    const artifacts = readMigrationArtifacts(location, directory);
    for (const artifact of artifacts) {
      addArtifact(rowMap, artifact);
    }
  }

  let ledgerRows = [];
  if (dbUrl) {
    ledgerRows = await loadLedgerRows(dbUrl);
    for (const ledgerRow of ledgerRows) {
      const row = getOrCreateRow(rowMap, ledgerRow.logicalId);
      attachLedgerRecord(row, ledgerRow);
    }
  }

  for (const override of Object.values(overrides)) {
    getOrCreateRow(rowMap, override.logicalId);
  }

  const rows = finalizeRows(rowMap, overrides);
  const metadata = {
    dbMode: Boolean(dbUrl),
    failOnStates,
    sourcePaths: SOURCE_PATHS,
    overridesPath: OVERRIDES_PATH,
    ledgerRowCount: ledgerRows.length,
  };

  if (format === 'json') {
    renderJson(rows, metadata);
  } else if (format === 'markdown') {
    renderMarkdown(rows);
    renderSuggestionSections(rows);
  } else {
    renderTable(rows);
    renderSuggestionSections(rows);
  }

  maybeFailOnStates(rows, failOnStates);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
