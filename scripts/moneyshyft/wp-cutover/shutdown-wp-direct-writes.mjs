#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ARTIFACT_DIR = '_bmad-output/test-artifacts/release-evidence';
const DEFAULT_DB_PORT = 3306;

const usage = () => {
  console.log(`MoneyShyft WP direct-write shutdown

Usage:
  node scripts/moneyshyft/wp-cutover/shutdown-wp-direct-writes.mjs [options]

Options:
  --apply                     Execute revocation/grant SQL against WP DB (default: plan-only)
  --skip-api-check            Skip route-bridge reconcile-only API verification
  --artifact-dir <path>       Evidence output directory (default: ${DEFAULT_ARTIFACT_DIR})
  --help                      Show this help

Required environment:
  WP_DB_HOST
  WP_DB_PORT                  (optional, default: ${DEFAULT_DB_PORT})
  WP_DB_NAME
  WP_DB_ADMIN_USER
  WP_DB_ADMIN_PASSWORD
  WP_DB_WRITE_USER            (WordPress/plugin DB principal to restrict)
  WP_DB_WRITE_HOST            (optional, default: %)
  WP_ROUTE_TABLES             (comma-separated MoneyShyft authority tables in WP DB)

Optional environment:
  WP_ENFORCE_SELECT_ONLY      (default: true)
  MYSQL_BIN                   (default: mysql)
  RS_CUTOVER_API_BASE_URL
  RS_CUTOVER_ACCESS_TOKEN
  RS_CUTOVER_LOGIN_EMAIL
  RS_CUTOVER_LOGIN_PASSWORD
  TEST_EMAIL
  TEST_PASSWORD

Examples:
  # plan-only (generates SQL + evidence without changing DB)
  node scripts/moneyshyft/wp-cutover/shutdown-wp-direct-writes.mjs

  # apply + full verification
  node scripts/moneyshyft/wp-cutover/shutdown-wp-direct-writes.mjs --apply
`);
};

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const toBoolean = (value, fallback = false) => {
  const normalized = toTrimmedString(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const parseArgs = (argv) => {
  const options = {
    apply: false,
    skipApiCheck: false,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--skip-api-check') {
      options.skipApiCheck = true;
      continue;
    }
    if (arg === '--artifact-dir') {
      options.artifactDir = argv[index + 1] || options.artifactDir;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
};

const toUtcFileStamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const requireEnv = (name) => {
  const value = toTrimmedString(process.env[name]);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parseTables = (raw) => {
  const tables = raw
    .split(/[,\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  if (tables.length === 0) {
    throw new Error('WP_ROUTE_TABLES must include at least one table.');
  }
  for (const table of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(table)) {
      throw new Error(`Unsafe table name '${table}'. Use only [A-Za-z0-9_].`);
    }
  }
  return [...new Set(tables)];
};

const sqlQuote = (value) => `'${value.replace(/'/g, "''")}'`;
const sqlBacktick = (value) => `\`${value.replace(/`/g, '``')}\``;

const runCommand = (bin, args, options = {}) => {
  try {
    const stdout = execFileSync(bin, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    return {
      ok: true,
      stdout: stdout || '',
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString('utf8') || '',
      stderr: error.stderr?.toString('utf8') || error.message,
      status: typeof error.status === 'number' ? error.status : null,
    };
  }
};

const runMysql = (context, sql, databaseOverride = null) => {
  const db = databaseOverride || context.dbName;
  const args = [
    '--host',
    context.dbHost,
    '--port',
    String(context.dbPort),
    '--user',
    context.dbAdminUser,
    '--batch',
    '--raw',
    '--skip-column-names',
    db,
    '--execute',
    sql,
  ];
  return runCommand(context.mysqlBin, args, {
    env: {
      ...process.env,
      MYSQL_PWD: context.dbAdminPassword,
    },
  });
};

const parseLineSet = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const hasWritePrivilegeForDb = (grantLine, dbName) => {
  const hasWrite = /\b(INSERT|UPDATE|DELETE)\b/i.test(grantLine);
  if (!hasWrite) {
    return false;
  }
  const normalized = grantLine.replace(/`/g, '');
  return (
    normalized.includes(`ON ${dbName}.`) ||
    normalized.includes('ON *.*') ||
    normalized.includes(`ON ${dbName}.*`)
  );
};

const hasSelectPrivilegeForDb = (grantLine, dbName) => {
  const hasSelect = /\bSELECT\b/i.test(grantLine);
  if (!hasSelect) {
    return false;
  }
  const normalized = grantLine.replace(/`/g, '');
  return (
    normalized.includes(`ON ${dbName}.`) ||
    normalized.includes('ON *.*') ||
    normalized.includes(`ON ${dbName}.*`)
  );
};

const writeJson = (filePath, payload) => {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const writeText = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
};

const runReconcileOnlyCheck = (artifactDir) => {
  const ts = toUtcFileStamp();
  const reconcileReportPath = path.join(
    artifactDir,
    `route-cutover-reconcile-only-after-wp-write-shutdown-${ts}.json`,
  );
  const reconcileNormalizedPath = path.join(
    artifactDir,
    `route-cutover-reconcile-only-after-wp-write-shutdown-normalized-${ts}.json`,
  );

  const result = runCommand(
    'node',
    [
      'scripts/moneyshyft/wp-cutover/rehearse-route-cutover.mjs',
      '--reconcile-only',
      '--output',
      reconcileReportPath,
      '--normalized-output',
      reconcileNormalizedPath,
    ],
    {
      env: { ...process.env },
    },
  );

  const payload = {
    ok: result.ok,
    reconcileReportPath,
    reconcileNormalizedPath,
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status ?? 0,
    success: false,
    driftDetected: null,
    singleSourceOfTruthConfirmed: null,
  };

  if (!result.ok) {
    return payload;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reconcileReportPath, 'utf8'));
    const reconciliation = report.execution?.reconciliationResults?.[0] || {};
    payload.success = report.success === true;
    payload.driftDetected = reconciliation.driftDetected === true;
    payload.singleSourceOfTruthConfirmed = reconciliation.singleSourceOfTruthConfirmed === true;
  } catch (error) {
    payload.ok = false;
    payload.success = false;
    payload.stderr = `${payload.stderr}\nFailed to parse reconcile report: ${error.message}`.trim();
  }

  return payload;
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const startedAtUtc = new Date().toISOString();
  const runStamp = toUtcFileStamp();
  const artifactRoot = path.resolve(process.cwd(), options.artifactDir);
  const artifactDir = path.join(artifactRoot, `wp-write-shutdown-${runStamp}`);
  fs.mkdirSync(artifactDir, { recursive: true });

  const reportPath = path.join(artifactDir, `wp-write-shutdown-report-${runStamp}.json`);
  const summaryPath = path.join(artifactDir, `wp-write-shutdown-summary-${runStamp}.md`);
  const grantsBeforePath = path.join(artifactDir, `wp-write-user-grants-before-${runStamp}.txt`);
  const grantsAfterPath = path.join(artifactDir, `wp-write-user-grants-after-${runStamp}.txt`);
  const sqlPlanPath = path.join(artifactDir, `wp-write-shutdown-sql-${runStamp}.sql`);

  const report = {
    startedAtUtc,
    finishedAtUtc: null,
    mode: options.apply ? 'apply' : 'plan',
    skipApiCheck: options.skipApiCheck,
    artifactDir,
    mysql: null,
    sqlPlanPath,
    grantsBeforePath,
    grantsAfterPath,
    dbVerification: null,
    apiVerification: null,
    success: false,
    errors: [],
  };

  try {
    const mysql = {
      mysqlBin: toTrimmedString(process.env.MYSQL_BIN) || 'mysql',
      dbHost: requireEnv('WP_DB_HOST'),
      dbPort: Number.parseInt(toTrimmedString(process.env.WP_DB_PORT) || `${DEFAULT_DB_PORT}`, 10),
      dbName: requireEnv('WP_DB_NAME'),
      dbAdminUser: requireEnv('WP_DB_ADMIN_USER'),
      dbAdminPassword: requireEnv('WP_DB_ADMIN_PASSWORD'),
      dbWriteUser: requireEnv('WP_DB_WRITE_USER'),
      dbWriteHost: toTrimmedString(process.env.WP_DB_WRITE_HOST) || '%',
      tables: parseTables(requireEnv('WP_ROUTE_TABLES')),
      enforceSelectOnly: toBoolean(process.env.WP_ENFORCE_SELECT_ONLY, true),
    };

    if (!Number.isInteger(mysql.dbPort) || mysql.dbPort <= 0) {
      throw new Error('WP_DB_PORT must be a positive integer.');
    }

    report.mysql = {
      mysqlBin: mysql.mysqlBin,
      dbHost: mysql.dbHost,
      dbPort: mysql.dbPort,
      dbName: mysql.dbName,
      dbWriteUser: mysql.dbWriteUser,
      dbWriteHost: mysql.dbWriteHost,
      tables: mysql.tables,
      enforceSelectOnly: mysql.enforceSelectOnly,
    };

    const connectionCheck = runMysql(mysql, 'SELECT 1;');
    if (!connectionCheck.ok) {
      throw new Error(`Failed to connect to WP DB via mysql CLI: ${connectionCheck.stderr}`);
    }

    const userExistsSql = `
SELECT COUNT(*)
FROM mysql.user
WHERE user = ${sqlQuote(mysql.dbWriteUser)}
  AND host = ${sqlQuote(mysql.dbWriteHost)};
`;
    const userCheck = runMysql(mysql, userExistsSql);
    if (!userCheck.ok) {
      throw new Error(`Failed to verify WP write user existence: ${userCheck.stderr}`);
    }
    const userCount = Number.parseInt(toTrimmedString(userCheck.stdout), 10);
    if (!Number.isInteger(userCount) || userCount < 1) {
      throw new Error(
        `WP write user '${mysql.dbWriteUser}'@'${mysql.dbWriteHost}' not found in mysql.user.`,
      );
    }

    const tablesMissing = [];
    for (const table of mysql.tables) {
      const tableCheckSql = `
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = ${sqlQuote(mysql.dbName)}
  AND table_name = ${sqlQuote(table)};
`;
      const tableCheck = runMysql(mysql, tableCheckSql);
      if (!tableCheck.ok) {
        throw new Error(`Failed to verify table '${table}' existence: ${tableCheck.stderr}`);
      }
      const count = Number.parseInt(toTrimmedString(tableCheck.stdout), 10);
      if (!Number.isInteger(count) || count < 1) {
        tablesMissing.push(table);
      }
    }
    if (tablesMissing.length > 0) {
      throw new Error(
        `One or more WP_ROUTE_TABLES are missing in schema '${mysql.dbName}': ${tablesMissing.join(', ')}`,
      );
    }

    const showGrantsSql = `SHOW GRANTS FOR ${sqlQuote(mysql.dbWriteUser)}@${sqlQuote(mysql.dbWriteHost)};`;
    const grantsBefore = runMysql(mysql, showGrantsSql);
    if (!grantsBefore.ok) {
      throw new Error(`Failed to read grants before shutdown: ${grantsBefore.stderr}`);
    }
    writeText(grantsBeforePath, grantsBefore.stdout || '');

    const sqlStatements = [
      `REVOKE INSERT, UPDATE, DELETE ON ${sqlBacktick(mysql.dbName)}.* FROM ${sqlQuote(mysql.dbWriteUser)}@${sqlQuote(mysql.dbWriteHost)};`,
    ];

    for (const table of mysql.tables) {
      sqlStatements.push(
        `REVOKE INSERT, UPDATE, DELETE ON ${sqlBacktick(mysql.dbName)}.${sqlBacktick(table)} FROM ${sqlQuote(mysql.dbWriteUser)}@${sqlQuote(mysql.dbWriteHost)};`,
      );
      if (mysql.enforceSelectOnly) {
        sqlStatements.push(
          `GRANT SELECT ON ${sqlBacktick(mysql.dbName)}.${sqlBacktick(table)} TO ${sqlQuote(mysql.dbWriteUser)}@${sqlQuote(mysql.dbWriteHost)};`,
        );
      }
    }
    sqlStatements.push('FLUSH PRIVILEGES;');
    writeText(sqlPlanPath, `${sqlStatements.join('\n')}\n`);

    if (options.apply) {
      const applySql = runMysql(mysql, sqlStatements.join('\n'));
      if (!applySql.ok) {
        throw new Error(`Failed to apply write-shutdown SQL: ${applySql.stderr}`);
      }
    }

    const grantsAfter = runMysql(mysql, showGrantsSql);
    if (!grantsAfter.ok) {
      throw new Error(`Failed to read grants after shutdown: ${grantsAfter.stderr}`);
    }
    writeText(grantsAfterPath, grantsAfter.stdout || '');

    const beforeLines = parseLineSet(grantsBefore.stdout);
    const afterLines = parseLineSet(grantsAfter.stdout);
    const writeGrantViolations = afterLines.filter((line) => hasWritePrivilegeForDb(line, mysql.dbName));
    const hasSelectCoverage = afterLines.some((line) => hasSelectPrivilegeForDb(line, mysql.dbName));

    report.dbVerification = {
      grantsBefore: beforeLines,
      grantsAfter: afterLines,
      writeGrantViolations,
      hasSelectCoverage,
      passed: writeGrantViolations.length === 0 && (!mysql.enforceSelectOnly || hasSelectCoverage),
    };

    if (!options.skipApiCheck) {
      report.apiVerification = runReconcileOnlyCheck(artifactDir);
    } else {
      report.apiVerification = {
        ok: true,
        skipped: true,
        reason: '--skip-api-check provided',
      };
    }

    const apiPassed = report.apiVerification?.ok === true
      && (report.apiVerification?.skipped === true
        || (
          report.apiVerification?.success === true
          && report.apiVerification?.driftDetected === false
          && report.apiVerification?.singleSourceOfTruthConfirmed === true
        ));

    report.success = report.dbVerification.passed && apiPassed && options.apply;

    if (!options.apply) {
      report.errors.push('Run executed in plan mode. Re-run with --apply to complete shutdown.');
    }
    if (!report.dbVerification.passed) {
      report.errors.push('DB verification failed: WP write principal still has write access or missing read coverage.');
    }
    if (!apiPassed) {
      report.errors.push('API verification failed: reconcile-only check did not pass drift-free.');
    }
  } catch (error) {
    report.success = false;
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAtUtc = new Date().toISOString();
    writeJson(reportPath, report);
  }

  const summaryLines = [
    '# WP Direct-Write Shutdown Evidence',
    '',
    `- Started (UTC): ${report.startedAtUtc}`,
    `- Finished (UTC): ${report.finishedAtUtc}`,
    `- Mode: ${report.mode}`,
    `- Success: ${report.success}`,
    '',
    '## Artifacts',
    `- Report JSON: \`${reportPath}\``,
    `- SQL Plan: \`${report.sqlPlanPath}\``,
    `- Grants (before): \`${report.grantsBeforePath}\``,
    `- Grants (after): \`${report.grantsAfterPath}\``,
    '',
    '## Verification',
    `- DB verification passed: ${report.dbVerification?.passed === true}`,
    `- API verification passed: ${report.apiVerification?.ok === true && report.apiVerification?.success === true && report.apiVerification?.driftDetected === false && report.apiVerification?.singleSourceOfTruthConfirmed === true}`,
    '',
    '## Errors',
  ];

  if (report.errors.length === 0) {
    summaryLines.push('- none');
  } else {
    for (const error of report.errors) {
      summaryLines.push(`- ${error}`);
    }
  }

  writeText(summaryPath, `${summaryLines.join('\n')}\n`);
  console.log(`WP write shutdown evidence report: ${reportPath}`);
  console.log(`WP write shutdown summary: ${summaryPath}`);

  if (!report.success) {
    process.exit(1);
  }
};

main();
