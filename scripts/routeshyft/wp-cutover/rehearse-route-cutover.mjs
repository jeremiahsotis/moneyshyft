#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SOURCE_TYPE = 'wordpress_fulfillment';
const DEFAULT_WRITE_MODE = 'api_only';
const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const DEFAULT_RECONCILIATION_LIMIT = 5000;

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = toTrimmedString(value);
    if (normalized) {
      return normalized;
    }
  }
  return '';
};

const parseBooleanFlag = (value) => value === true || value === 'true' || value === '1';

const toAbsolutePath = (value) => path.resolve(process.cwd(), value);

const usage = () => {
  console.log(`RouteShyft WP cutover rehearsal

Usage:
  node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs --input <wp-export.json> [options]

Options:
  --input <path>                WP export JSON file (array or { items: [] })
  --output <path>               Rehearsal report JSON output path
  --normalized-output <path>    Normalized export output path
  --api-base <url>              API base URL (default: ${DEFAULT_API_BASE})
  --source-type <value>         Bridge sourceType (default: ${DEFAULT_SOURCE_TYPE})
  --write-mode <value>          Bridge write mode assertion (default: ${DEFAULT_WRITE_MODE})
  --default-org-unit-id <id>    Fallback orgUnitId if row value is missing
  --reconciliation-limit <n>    /reconciliation query limit (default: ${DEFAULT_RECONCILIATION_LIMIT})
  --limit <n>                   Optional max rows from input
  --transform-only              Normalize + validate only (no API calls)
  --dry-run                     Build planned API actions but do not call API
  --help                        Show this help

Auth for non-dry-run:
  Either set RS_CUTOVER_ACCESS_TOKEN, or set RS_CUTOVER_LOGIN_EMAIL and RS_CUTOVER_LOGIN_PASSWORD
  (fallbacks to TEST_EMAIL and TEST_PASSWORD).
`);
};

const parseArgs = (argv) => {
  const options = {
    inputPath: '',
    outputPath: '',
    normalizedOutputPath: '',
    apiBaseUrl: process.env.RS_CUTOVER_API_BASE_URL || DEFAULT_API_BASE,
    sourceType: process.env.RS_CUTOVER_SOURCE_TYPE || DEFAULT_SOURCE_TYPE,
    writeMode: process.env.RS_CUTOVER_WRITE_MODE || DEFAULT_WRITE_MODE,
    defaultOrgUnitId: process.env.RS_CUTOVER_DEFAULT_ORG_UNIT_ID || '',
    reconciliationLimit: Number.parseInt(
      process.env.RS_CUTOVER_RECONCILIATION_LIMIT || String(DEFAULT_RECONCILIATION_LIMIT),
      10,
    ),
    limit: 0,
    transformOnly: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--transform-only') {
      options.transformOnly = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--input') {
      options.inputPath = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg === '--output') {
      options.outputPath = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg === '--normalized-output') {
      options.normalizedOutputPath = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg === '--api-base') {
      options.apiBaseUrl = argv[index + 1] || options.apiBaseUrl;
      index += 1;
      continue;
    }

    if (arg === '--source-type') {
      options.sourceType = argv[index + 1] || options.sourceType;
      index += 1;
      continue;
    }

    if (arg === '--write-mode') {
      options.writeMode = argv[index + 1] || options.writeMode;
      index += 1;
      continue;
    }

    if (arg === '--default-org-unit-id') {
      options.defaultOrgUnitId = argv[index + 1] || options.defaultOrgUnitId;
      index += 1;
      continue;
    }

    if (arg === '--reconciliation-limit') {
      const parsed = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.reconciliationLimit = parsed;
      }
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      const parsed = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const resolveInputRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  if (payload && Array.isArray(payload.records)) {
    return payload.records;
  }

  throw new Error('Input JSON must be an array or an object with items/records array.');
};

const normalizeStatus = (value) => toTrimmedString(value).toLowerCase();

const buildCompletionKey = (sourceId) => `wp-cutover-complete-${sourceId}`;

const normalizeRecords = (rows, options) => {
  const normalized = [];
  const skippedDuplicates = [];
  const errors = [];

  const sourceToLineage = new Map();
  const lineageToSource = new Map();

  const maxRows = options.limit > 0 ? Math.min(options.limit, rows.length) : rows.length;

  for (let index = 0; index < maxRows; index += 1) {
    const row = rows[index] || {};

    const sourceId = firstNonEmpty(
      row.sourceId,
      row.source_id,
      row.fulfillmentId,
      row.fulfillment_id,
      row.wpFulfillmentId,
      row.wp_fulfillment_id,
      row.id,
    );

    if (!sourceId) {
      errors.push({
        rowNumber: index + 1,
        code: 'MISSING_SOURCE_ID',
        message: 'sourceId/fulfillmentId/id is required.',
      });
      continue;
    }

    const externalRef = firstNonEmpty(
      row.externalRef,
      row.external_ref,
      row.bridgeLineageId,
      row.bridge_lineage_id,
      row.wpRequestId,
      row.wp_request_id,
      row.requestId,
      row.request_id,
      row.lineageId,
      row.lineage_id,
    );

    const orgUnitId = firstNonEmpty(
      row.orgUnitId,
      row.org_unit_id,
      options.defaultOrgUnitId,
    );

    const status = normalizeStatus(row.status || row.fulfillmentStatus || row.fulfillment_status);
    const completionRequested = row.completionRequested === true
      || parseBooleanFlag(row.completion_requested)
      || status === 'completed'
      || status === 'complete'
      || status === 'done';

    const completionReason = firstNonEmpty(
      row.completionReason,
      row.completion_reason,
      row.reason,
    );

    const completionIdempotencyKey = firstNonEmpty(
      row.idempotencyKey,
      row.idempotency_key,
      row.completionIdempotencyKey,
      row.completion_idempotency_key,
      completionRequested ? buildCompletionKey(sourceId) : '',
    );

    const seenLineageForSource = sourceToLineage.get(sourceId) || '';
    if (seenLineageForSource && externalRef && seenLineageForSource !== externalRef) {
      errors.push({
        rowNumber: index + 1,
        code: 'SOURCE_LINEAGE_CONFLICT',
        message: `sourceId '${sourceId}' maps to multiple lineage values ('${seenLineageForSource}' vs '${externalRef}').`,
      });
      continue;
    }

    const seenSourceForLineage = externalRef ? lineageToSource.get(externalRef) || '' : '';
    if (seenSourceForLineage && seenSourceForLineage !== sourceId) {
      errors.push({
        rowNumber: index + 1,
        code: 'LINEAGE_SOURCE_CONFLICT',
        message: `lineage '${externalRef}' maps to multiple sourceIds ('${seenSourceForLineage}' vs '${sourceId}').`,
      });
      continue;
    }

    const existingRow = normalized.find((item) => item.sourceId === sourceId);
    if (existingRow) {
      skippedDuplicates.push({
        rowNumber: index + 1,
        sourceId,
        reason: 'duplicate sourceId with same lineage mapping',
      });
      continue;
    }

    if (externalRef) {
      sourceToLineage.set(sourceId, externalRef);
      lineageToSource.set(externalRef, sourceId);
    }

    normalized.push({
      rowNumber: index + 1,
      sourceType: options.sourceType,
      sourceId,
      externalRef: externalRef || null,
      orgUnitId: orgUnitId || null,
      completion: {
        requested: completionRequested,
        reason: completionReason || null,
        idempotencyKey: completionIdempotencyKey || null,
      },
    });
  }

  return {
    normalized,
    skippedDuplicates,
    errors,
  };
};

const writeJson = (filePath, payload) => {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const parseAccessTokenFromSetCookie = (headerValue) => {
  const match = headerValue.match(/access_token=([^;]+)/);
  return match ? match[1] : '';
};

const resolveAccessToken = async (apiBaseUrl) => {
  const directToken = toTrimmedString(process.env.RS_CUTOVER_ACCESS_TOKEN);
  if (directToken) {
    return directToken;
  }

  const email = firstNonEmpty(process.env.RS_CUTOVER_LOGIN_EMAIL, process.env.TEST_EMAIL);
  const password = firstNonEmpty(process.env.RS_CUTOVER_LOGIN_PASSWORD, process.env.TEST_PASSWORD);

  if (!email || !password) {
    throw new Error(
      'Auth required: set RS_CUTOVER_ACCESS_TOKEN or RS_CUTOVER_LOGIN_EMAIL/RS_CUTOVER_LOGIN_PASSWORD (or TEST_EMAIL/TEST_PASSWORD).',
    );
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      rememberMe: false,
    }),
  });

  const setCookieHeader = response.headers.get('set-cookie') || '';
  const accessToken = parseAccessTokenFromSetCookie(setCookieHeader);
  if (!response.ok || !accessToken) {
    const bodyText = await response.text();
    throw new Error(
      `Login failed (${response.status}). Ensure auth harness credentials are valid. Response: ${bodyText}`,
    );
  }

  return accessToken;
};

const requestJson = async ({
  url,
  method,
  accessToken,
  body,
}) => {
  const response = await fetch(url, {
    method,
    headers: {
      cookie: `access_token=${accessToken}`,
      'content-type': 'application/json',
      'x-correlation-id': `cutover-${Date.now()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsedBody = null;
  try {
    parsedBody = text ? JSON.parse(text) : null;
  } catch {
    parsedBody = {
      parseError: true,
      rawText: text,
    };
  }

  return {
    status: response.status,
    parsedBody,
  };
};

const executeDryRun = (normalized, options) => {
  const actions = [];

  for (const record of normalized) {
    actions.push({
      action: 'POST /api/v1/route-bridge/fulfillment',
      rowNumber: record.rowNumber,
      payload: {
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        orgUnitId: record.orgUnitId,
        externalRef: record.externalRef,
        wpWriteMode: options.writeMode,
      },
    });

    if (record.completion.requested) {
      actions.push({
        action: 'POST /api/v1/route-bridge/fulfillment/:commitmentId/completion',
        rowNumber: record.rowNumber,
        payload: {
          idempotencyKey: record.completion.idempotencyKey,
          bridgeLineageId: record.externalRef,
          reason: record.completion.reason,
          wpWriteMode: options.writeMode,
        },
      });
    }
  }

  const orgUnits = [...new Set(normalized.map((record) => record.orgUnitId).filter(Boolean))];
  if (orgUnits.length === 0) {
    actions.push({
      action: 'GET /api/v1/route-bridge/reconciliation',
      query: {
        sourceType: options.sourceType,
        limit: options.reconciliationLimit,
      },
    });
  } else {
    for (const orgUnitId of orgUnits) {
      actions.push({
        action: 'GET /api/v1/route-bridge/reconciliation',
        query: {
          sourceType: options.sourceType,
          orgUnitId,
          limit: options.reconciliationLimit,
        },
      });
    }
  }

  return {
    plannedActionCount: actions.length,
    actions,
  };
};

const executeBridgeFlow = async (normalized, options) => {
  const accessToken = await resolveAccessToken(options.apiBaseUrl);
  const apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');

  const importResults = {
    attempted: 0,
    created: 0,
    replayed: 0,
    failures: [],
  };

  const completionResults = {
    attempted: 0,
    applied: 0,
    replayed: 0,
    failures: [],
  };

  const commitmentBySource = new Map();

  for (const record of normalized) {
    importResults.attempted += 1;

    const createPayload = {
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      wpWriteMode: options.writeMode,
    };

    if (record.orgUnitId) {
      createPayload.orgUnitId = record.orgUnitId;
    }

    if (record.externalRef) {
      createPayload.externalRef = record.externalRef;
    }

    const createResponse = await requestJson({
      url: `${apiBaseUrl}/api/v1/route-bridge/fulfillment`,
      method: 'POST',
      accessToken,
      body: createPayload,
    });

    const createCode = toTrimmedString(createResponse.parsedBody?.code);
    if (createResponse.parsedBody?.ok !== true) {
      importResults.failures.push({
        rowNumber: record.rowNumber,
        sourceId: record.sourceId,
        stage: 'fulfillment',
        status: createResponse.status,
        response: createResponse.parsedBody,
      });
      continue;
    }

    if (createCode === 'ROUTE_BRIDGE_FULFILLMENT_CREATED') {
      importResults.created += 1;
    } else if (createCode === 'ROUTE_BRIDGE_FULFILLMENT_IDEMPOTENT_REPLAY') {
      importResults.replayed += 1;
    }

    const commitmentId = toTrimmedString(
      createResponse.parsedBody?.data?.canonicalLifecycle?.commitment?.commitmentId,
    );

    if (commitmentId) {
      commitmentBySource.set(record.sourceId, commitmentId);
    }

    if (!record.completion.requested) {
      continue;
    }

    completionResults.attempted += 1;

    if (!commitmentId) {
      completionResults.failures.push({
        rowNumber: record.rowNumber,
        sourceId: record.sourceId,
        stage: 'completion',
        message: 'Missing commitmentId from fulfillment response; cannot submit completion.',
      });
      continue;
    }

    if (!record.externalRef) {
      completionResults.failures.push({
        rowNumber: record.rowNumber,
        sourceId: record.sourceId,
        stage: 'completion',
        message: 'Missing externalRef/lineage value required for completion bridgeLineageId.',
      });
      continue;
    }

    const completionPayload = {
      idempotencyKey: record.completion.idempotencyKey || buildCompletionKey(record.sourceId),
      bridgeLineageId: record.externalRef,
      wpWriteMode: options.writeMode,
    };

    if (record.completion.reason) {
      completionPayload.reason = record.completion.reason;
    }

    const completionResponse = await requestJson({
      url: `${apiBaseUrl}/api/v1/route-bridge/fulfillment/${encodeURIComponent(commitmentId)}/completion`,
      method: 'POST',
      accessToken,
      body: completionPayload,
    });

    const completionCode = toTrimmedString(completionResponse.parsedBody?.code);
    if (completionResponse.parsedBody?.ok !== true) {
      completionResults.failures.push({
        rowNumber: record.rowNumber,
        sourceId: record.sourceId,
        stage: 'completion',
        status: completionResponse.status,
        response: completionResponse.parsedBody,
      });
      continue;
    }

    if (completionCode === 'ROUTE_BRIDGE_COMPLETION_APPLIED') {
      completionResults.applied += 1;
    } else if (completionCode === 'ROUTE_BRIDGE_COMPLETION_IDEMPOTENT_REPLAY') {
      completionResults.replayed += 1;
    }
  }

  const reconciliationResults = [];
  const orgUnits = [...new Set(normalized.map((record) => record.orgUnitId).filter(Boolean))];
  const scopes = orgUnits.length === 0 ? [null] : orgUnits;

  for (const orgUnitId of scopes) {
    const query = new URLSearchParams({
      sourceType: options.sourceType,
      limit: String(options.reconciliationLimit),
    });
    if (orgUnitId) {
      query.set('orgUnitId', orgUnitId);
    }

    const reconciliationResponse = await requestJson({
      url: `${apiBaseUrl}/api/v1/route-bridge/reconciliation?${query.toString()}`,
      method: 'GET',
      accessToken,
    });

    reconciliationResults.push({
      orgUnitId,
      status: reconciliationResponse.status,
      code: reconciliationResponse.parsedBody?.code || null,
      driftDetected: reconciliationResponse.parsedBody?.data?.reconciliation?.driftDetected === true,
      singleSourceOfTruthConfirmed:
        reconciliationResponse.parsedBody?.data?.reconciliation?.singleSourceOfTruthConfirmed === true,
      response: reconciliationResponse.parsedBody,
    });
  }

  return {
    importResults,
    completionResults,
    reconciliationResults,
    commitmentsObserved: Object.fromEntries(commitmentBySource.entries()),
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    usage();
    return;
  }

  if (!options.inputPath) {
    throw new Error('Missing required --input path.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = toAbsolutePath(
    options.outputPath || `_bmad-output/test-artifacts/route-cutover-rehearsal-${timestamp}.json`,
  );
  const normalizedOutputPath = toAbsolutePath(
    options.normalizedOutputPath || `_bmad-output/test-artifacts/route-cutover-normalized-${timestamp}.json`,
  );

  const inputPath = toAbsolutePath(options.inputPath);
  const rawPayload = readJson(inputPath);
  const rows = resolveInputRows(rawPayload);

  const normalizedResult = normalizeRecords(rows, options);
  writeJson(normalizedOutputPath, {
    source: inputPath,
    sourceRowCount: rows.length,
    normalizedCount: normalizedResult.normalized.length,
    skippedDuplicateCount: normalizedResult.skippedDuplicates.length,
    errors: normalizedResult.errors,
    records: normalizedResult.normalized,
  });

  const report = {
    startedAtUtc: new Date().toISOString(),
    inputPath,
    outputPath: reportPath,
    normalizedOutputPath,
    mode: options.transformOnly ? 'transform-only' : options.dryRun ? 'dry-run' : 'apply',
    apiBaseUrl: options.apiBaseUrl,
    sourceType: options.sourceType,
    writeMode: options.writeMode,
    sourceRowCount: rows.length,
    normalizedCount: normalizedResult.normalized.length,
    skippedDuplicateCount: normalizedResult.skippedDuplicates.length,
    validationErrors: normalizedResult.errors,
    dryRunPlan: null,
    execution: null,
    finishedAtUtc: null,
    success: false,
  };

  if (normalizedResult.errors.length > 0) {
    report.finishedAtUtc = new Date().toISOString();
    writeJson(reportPath, report);
    throw new Error(`Normalization failed with ${normalizedResult.errors.length} error(s).`);
  }

  if (options.transformOnly) {
    report.finishedAtUtc = new Date().toISOString();
    report.success = true;
    writeJson(reportPath, report);
    console.log(`Transform complete: ${normalizedResult.normalized.length} records normalized.`);
    console.log(`Normalized output: ${normalizedOutputPath}`);
    console.log(`Report: ${reportPath}`);
    return;
  }

  if (options.dryRun) {
    report.dryRunPlan = executeDryRun(normalizedResult.normalized, options);
    report.finishedAtUtc = new Date().toISOString();
    report.success = true;
    writeJson(reportPath, report);
    console.log(`Dry run complete: ${report.dryRunPlan.plannedActionCount} planned action(s).`);
    console.log(`Normalized output: ${normalizedOutputPath}`);
    console.log(`Report: ${reportPath}`);
    return;
  }

  const execution = await executeBridgeFlow(normalizedResult.normalized, options);
  report.execution = execution;
  report.finishedAtUtc = new Date().toISOString();

  const failureCount = execution.importResults.failures.length
    + execution.completionResults.failures.length;
  const driftDetected = execution.reconciliationResults.some((entry) => entry.driftDetected === true);

  report.success = failureCount === 0 && !driftDetected;
  writeJson(reportPath, report);

  console.log(`Cutover rehearsal completed. Success=${report.success}`);
  console.log(`Normalized output: ${normalizedOutputPath}`);
  console.log(`Report: ${reportPath}`);

  if (!report.success) {
    throw new Error(
      `Cutover rehearsal reported ${failureCount} failure(s) and driftDetected=${driftDetected}.`,
    );
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
