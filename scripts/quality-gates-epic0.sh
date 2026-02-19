#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const root = process.cwd();

const resolveJwtModule = () => {
  try {
    return require('jsonwebtoken');
  } catch (_error) {
    // Continue to backend-local install fallback.
  }

  try {
    return require(path.join(root, 'src/node_modules/jsonwebtoken'));
  } catch (_error) {
    // Continue to explicit failure with remediation.
  }

  throw new Error(
    'Missing jsonwebtoken dependency. Install with `npm ci` or `cd src && npm ci` before running Epic 0 quality gates.'
  );
};

const jwt = resolveJwtModule();
const apiBaseUrl = (process.env.API_URL || process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const reportPathInput = process.env.EPIC0_QUALITY_REPORT_PATH || 'tests/artifacts/gates/epic-0-quality.json';
const reportPath = path.isAbsolute(reportPathInput)
  ? reportPathInput
  : path.join(root, reportPathInput);
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

const requiredReadinessGates = [
  'tenancy',
  'auth',
  'csrf',
  'envelope',
  'eventOutbox',
  'timezone',
  'rbac',
  'activeTenantMembership',
  'globalEmailUniqueness',
];
const failures = [];
const warnings = [];
const gateEvidence = {};

const tenantId = `tenant-${randomUUID()}`;
const correlationId = `corr-${randomUUID()}`;
const csrfToken = `csrf-${randomUUID()}`;
const refreshTokenId = `refresh-${randomUUID()}`;
const replacementRefreshTokenId = `replacement-${randomUUID()}`;
const timezoneUtcTimestamp = '2026-02-17T15:30:00.000Z';

const defaultHeaders = {
  'x-tenant-id': tenantId,
  'x-correlation-id': correlationId,
};

const parseDotEnv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key.length > 0) {
      result[key] = value;
    }
  }

  return result;
};

const backendEnv = parseDotEnv(path.join(root, 'src/.env'));
const jwtSecret = process.env.JWT_SECRET || backendEnv.JWT_SECRET || 'your_jwt_secret_change_in_production';
const signedTenantAccessToken = jwt.sign(
  {
    userId: `quality-gate-user-${randomUUID()}`,
    email: 'quality-gate@example.com',
    householdId: tenantId,
    activeTenantId: tenantId,
    activeOrgUnitId: null,
    role: 'TENANT_STAFF',
  },
  jwtSecret,
  { expiresIn: '2h' }
);

const tenantScopedHeaders = {
  ...defaultHeaders,
  'x-csrf-token': csrfToken,
  cookie: `access_token=${signedTenantAccessToken}; csrf_token=${csrfToken}`,
};

const requestJson = async (method, endpointPath, { headers = {}, data } = {}) => {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiBaseUrl}${endpointPath}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: controller.signal,
    });

    const raw = await response.text();
    let body = null;
    if (raw.trim() !== '') {
      try {
        body = JSON.parse(raw);
      } catch (_error) {
        body = { raw };
      }
    }

    return {
      ok: true,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const assertCondition = (condition, message, errors) => {
  if (!condition) {
    errors.push(message);
  }
};

const runGateCheck = async (gate, check) => {
  try {
    const result = await check();
    gateEvidence[gate] = {
      pass: result.pass,
      evidence: result.evidence,
    };

    if (!result.pass) {
      failures.push(`Phase-0 readiness gate failed: ${gate} (${result.evidence.join('; ')})`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    gateEvidence[gate] = {
      pass: false,
      evidence: [message],
    };
    failures.push(`Phase-0 readiness gate failed: ${gate} (${message})`);
  }
};

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) warnings.push(`Missing required file: ${rel}`);
}

for (const key of storyKeys) {
  const rel = `_bmad-output/implementation-artifacts/${key}.md`;
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) warnings.push(`Missing Epic 0 story file: ${rel}`);
}

const main = async () => {
  await runGateCheck('tenancy', async () => {
    const errors = [];

    const withoutTenant = await requestJson('GET', '/api/v1/platform/_kernel/tenancy/repository-check');
    assertCondition(withoutTenant.ok, `request failure: ${withoutTenant.error || 'network error'}`, errors);
    if (withoutTenant.ok) {
      assertCondition(withoutTenant.status === 403, `expected 403 without tenant context, got ${withoutTenant.status}`, errors);
      assertCondition(withoutTenant.body?.code === 'TENANCY_CONTEXT_REQUIRED', 'expected TENANCY_CONTEXT_REQUIRED', errors);
    }

    const scopedRead = await requestJson('GET', '/api/v1/platform/_kernel/tenancy/repository-check', {
      headers: tenantScopedHeaders,
    });
    assertCondition(scopedRead.ok, `request failure: ${scopedRead.error || 'network error'}`, errors);
    if (scopedRead.ok) {
      assertCondition(scopedRead.status === 200, `expected 200 for scoped read, got ${scopedRead.status}`, errors);
      assertCondition(scopedRead.body?.ok === true, 'expected ok=true for scoped read', errors);
      assertCondition(scopedRead.body?.code === 'TENANT_SCOPE_APPLIED', 'expected TENANT_SCOPE_APPLIED', errors);
    }

    const scopedWrite = await requestJson('POST', '/api/v1/platform/_kernel/tenancy/repository-check', {
      headers: tenantScopedHeaders,
      data: {
        targetTenantId: `tenant-${randomUUID()}`,
      },
    });
    assertCondition(scopedWrite.ok, `request failure: ${scopedWrite.error || 'network error'}`, errors);
    if (scopedWrite.ok) {
      assertCondition(scopedWrite.status === 200, `expected 200 for cross-tenant write refusal, got ${scopedWrite.status}`, errors);
      assertCondition(scopedWrite.body?.ok === false, 'expected ok=false for cross-tenant write refusal', errors);
      assertCondition(scopedWrite.body?.code === 'TENANT_SCOPE_VIOLATION', 'expected TENANT_SCOPE_VIOLATION', errors);
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['tenant isolation contract checks passed'] };
  });

  await runGateCheck('auth', async () => {
    const errors = [];
    const issue = await requestJson('POST', '/api/v1/platform/_kernel/sessions/refresh/issue', {
      headers: defaultHeaders,
      data: {
        refreshTokenId,
        userId: 'quality-gate-user',
        expiresInSeconds: 3600,
      },
    });
    assertCondition(issue.ok, `request failure: ${issue.error || 'network error'}`, errors);
    let issuedSessionId = null;
    if (issue.ok) {
      assertCondition(issue.status === 201, `expected 201 for refresh issue, got ${issue.status}`, errors);
      assertCondition(issue.body?.ok === true, 'expected ok=true for refresh issue', errors);
      assertCondition(issue.body?.code === 'REFRESH_SESSION_ISSUED', 'expected REFRESH_SESSION_ISSUED', errors);
      issuedSessionId = issue.body?.session?.sessionId || null;
      assertCondition(typeof issuedSessionId === 'string' && issuedSessionId.length > 0, 'expected issued sessionId', errors);
    }

    const rotate = await requestJson('POST', '/api/v1/platform/_kernel/sessions/refresh/rotate', {
      headers: defaultHeaders,
      data: {
        sessionId: issuedSessionId,
        presentedRefreshToken: refreshTokenId,
        replacementRefreshTokenId,
      },
    });
    assertCondition(rotate.ok, `request failure: ${rotate.error || 'network error'}`, errors);
    if (rotate.ok) {
      assertCondition(rotate.status === 200, `expected 200 for refresh rotate, got ${rotate.status}`, errors);
      assertCondition(rotate.body?.ok === true, 'expected ok=true for refresh rotate', errors);
      assertCondition(rotate.body?.code === 'REFRESH_SESSION_ROTATED', 'expected REFRESH_SESSION_ROTATED', errors);
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['session issuance and rotation checks passed'] };
  });

  await runGateCheck('csrf', async () => {
    const errors = [];
    const missing = await requestJson('POST', '/api/v1/platform/_kernel/security/csrf/guard', {
      headers: defaultHeaders,
      data: {
        action: 'quality-check',
      },
    });
    assertCondition(missing.ok, `request failure: ${missing.error || 'network error'}`, errors);
    if (missing.ok) {
      assertCondition(missing.status === 403, `expected 403 without CSRF evidence, got ${missing.status}`, errors);
      assertCondition(missing.body?.code === 'CSRF_TOKEN_REQUIRED', 'expected CSRF_TOKEN_REQUIRED', errors);
    }

    const valid = await requestJson('POST', '/api/v1/platform/_kernel/security/csrf/guard', {
      headers: {
        ...defaultHeaders,
        'x-csrf-token': csrfToken,
      },
      data: {
        csrfToken,
        action: 'quality-check',
      },
    });
    assertCondition(valid.ok, `request failure: ${valid.error || 'network error'}`, errors);
    if (valid.ok) {
      assertCondition(valid.status === 200, `expected 200 with valid CSRF evidence, got ${valid.status}`, errors);
      assertCondition(valid.body?.ok === true, 'expected ok=true for valid CSRF evidence', errors);
      assertCondition(valid.body?.code === 'CSRF_GUARD_PASSED', 'expected CSRF_GUARD_PASSED', errors);
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['csrf contract checks passed'] };
  });

  await runGateCheck('envelope', async () => {
    const errors = [];
    const refusalResult = await requestJson('POST', '/api/v1/platform/_kernel/contracts/envelope/business-refusal', {
      headers: defaultHeaders,
      data: {
        code: 'QUALITY_GATE_REFUSAL',
        message: 'Envelope refusal gate check',
      },
    });
    assertCondition(refusalResult.ok, `request failure: ${refusalResult.error || 'network error'}`, errors);
    if (refusalResult.ok) {
      assertCondition(refusalResult.status === 200, `expected 200 for business refusal, got ${refusalResult.status}`, errors);
      assertCondition(refusalResult.body?.ok === false, 'expected ok=false for business refusal', errors);
      assertCondition(refusalResult.body?.code === 'QUALITY_GATE_REFUSAL', 'expected QUALITY_GATE_REFUSAL', errors);
    }

    const successResult = await requestJson('POST', '/api/v1/platform/_kernel/contracts/envelope/success', {
      headers: defaultHeaders,
      data: {
        code: 'QUALITY_GATE_SUCCESS',
        message: 'Envelope success gate check',
      },
    });
    assertCondition(successResult.ok, `request failure: ${successResult.error || 'network error'}`, errors);
    if (successResult.ok) {
      assertCondition(successResult.status === 200, `expected 200 for envelope success, got ${successResult.status}`, errors);
      assertCondition(successResult.body?.ok === true, 'expected ok=true for envelope success', errors);
      assertCondition(successResult.body?.code === 'QUALITY_GATE_SUCCESS', 'expected QUALITY_GATE_SUCCESS', errors);
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['envelope contract checks passed'] };
  });

  await runGateCheck('eventOutbox', async () => {
    const errors = [];
    const eventsSchema = await requestJson('GET', '/api/v1/platform/_kernel/contracts/events/schema', {
      headers: defaultHeaders,
    });
    assertCondition(eventsSchema.ok, `request failure: ${eventsSchema.error || 'network error'}`, errors);
    if (eventsSchema.ok) {
      assertCondition(eventsSchema.status === 200, `expected 200 for events schema, got ${eventsSchema.status}`, errors);
      assertCondition(eventsSchema.body?.ok === true, 'expected ok=true for events schema', errors);
      assertCondition(eventsSchema.body?.table === 'platform.events', 'expected platform.events table metadata', errors);
    }

    const outboxSchema = await requestJson('GET', '/api/v1/platform/_kernel/contracts/outbox/schema', {
      headers: defaultHeaders,
    });
    assertCondition(outboxSchema.ok, `request failure: ${outboxSchema.error || 'network error'}`, errors);
    if (outboxSchema.ok) {
      assertCondition(outboxSchema.status === 200, `expected 200 for outbox schema, got ${outboxSchema.status}`, errors);
      assertCondition(outboxSchema.body?.ok === true, 'expected ok=true for outbox schema', errors);
      assertCondition(outboxSchema.body?.table === 'platform.outbox_events', 'expected platform.outbox_events table metadata', errors);
    }

    const missingWrites = await requestJson('POST', '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes', {
      headers: defaultHeaders,
      data: {
        eventWrite: true,
        outboxWrite: false,
      },
    });
    assertCondition(missingWrites.ok, `request failure: ${missingWrites.error || 'network error'}`, errors);
    if (missingWrites.ok) {
      assertCondition(missingWrites.status === 200, `expected 200 for missing writes refusal, got ${missingWrites.status}`, errors);
      assertCondition(missingWrites.body?.ok === false, 'expected ok=false for missing writes refusal', errors);
      assertCondition(
        missingWrites.body?.code === 'MUTATION_EVENT_OUTBOX_WRITE_REQUIRED',
        'expected MUTATION_EVENT_OUTBOX_WRITE_REQUIRED',
        errors
      );
    }

    const atomic = await requestJson('POST', '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/atomic', {
      headers: defaultHeaders,
      data: {
        domainWrite: true,
        eventWrite: true,
        outboxWrite: true,
      },
    });
    assertCondition(atomic.ok, `request failure: ${atomic.error || 'network error'}`, errors);
    if (atomic.ok) {
      assertCondition(atomic.status === 200, `expected 200 for atomic mutation contract, got ${atomic.status}`, errors);
      assertCondition(atomic.body?.ok === true, 'expected ok=true for atomic mutation contract', errors);
      assertCondition(
        atomic.body?.code === 'MUTATION_TRANSACTION_WRAPPER_ATOMIC',
        'expected MUTATION_TRANSACTION_WRAPPER_ATOMIC',
        errors
      );
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['events/outbox contract checks passed'] };
  });

  await runGateCheck('timezone', async () => {
    const errors = [];

    const contextResult = await requestJson('GET', '/api/v1/platform/time/render-context', {
      headers: {
        ...defaultHeaders,
        'x-user-timezone': 'America/Chicago',
      },
    });
    assertCondition(contextResult.ok, `request failure: ${contextResult.error || 'network error'}`, errors);
    if (contextResult.ok) {
      assertCondition(contextResult.status === 200, `expected 200 for timezone context, got ${contextResult.status}`, errors);
      assertCondition(contextResult.body?.ok === true, 'expected ok=true for timezone context', errors);
      assertCondition(contextResult.body?.timezoneSource === 'user', 'expected timezoneSource=user', errors);
    }

    const renderResult = await requestJson('POST', '/api/v1/platform/time/render-contract', {
      headers: {
        ...defaultHeaders,
        'x-user-timezone': 'America/Chicago',
      },
      data: {
        utcTimestamp: timezoneUtcTimestamp,
        purpose: 'quality-gate-check',
      },
    });
    assertCondition(renderResult.ok, `request failure: ${renderResult.error || 'network error'}`, errors);
    if (renderResult.ok) {
      assertCondition(renderResult.status === 200, `expected 200 for timezone render, got ${renderResult.status}`, errors);
      assertCondition(renderResult.body?.ok === true, 'expected ok=true for timezone render', errors);
      assertCondition(renderResult.body?.code === 'TIMEZONE_RENDER_CONTRACT_READY', 'expected TIMEZONE_RENDER_CONTRACT_READY', errors);
      assertCondition(
        typeof renderResult.body?.rendered === 'string' && renderResult.body.rendered !== timezoneUtcTimestamp,
        'expected rendered localized timestamp',
        errors
      );
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['timezone contract checks passed'] };
  });

  await runGateCheck('rbac', async () => {
    const errors = [];
    const matrixResult = await requestJson('GET', '/api/v1/platform/_kernel/contracts/rbac/three-layer-matrix', {
      headers: defaultHeaders,
    });

    assertCondition(matrixResult.ok, `request failure: ${matrixResult.error || 'network error'}`, errors);
    if (matrixResult.ok) {
      assertCondition(matrixResult.status === 200, `expected 200 for RBAC matrix, got ${matrixResult.status}`, errors);
      assertCondition(matrixResult.body?.ok === true, 'expected ok=true for RBAC matrix', errors);
      assertCondition(
        matrixResult.body?.code === 'RBAC_CAPABILITY_MATRIX_VALIDATED',
        'expected RBAC_CAPABILITY_MATRIX_VALIDATED',
        errors
      );
      assertCondition(Array.isArray(matrixResult.body?.roleModel), 'expected roleModel array in RBAC matrix response', errors);
      assertCondition(Array.isArray(matrixResult.body?.checks), 'expected checks array in RBAC matrix response', errors);
    }

    return { pass: errors.length === 0, evidence: errors.length ? errors : ['rbac capability matrix checks passed'] };
  });

  await runGateCheck('activeTenantMembership', async () => {
    const errors = [];
    const decoded = jwt.decode(signedTenantAccessToken);
    const decodedPayload = decoded && typeof decoded === 'object' ? decoded : null;
    const decodedActiveTenant = decodedPayload && typeof decodedPayload.activeTenantId === 'string'
      ? decodedPayload.activeTenantId
      : null;

    assertCondition(
      decodedActiveTenant === tenantId,
      'expected signed access token to contain explicit activeTenantId matching tenant scope',
      errors
    );

    const scopedRead = await requestJson('GET', '/api/v1/platform/_kernel/tenancy/repository-check', {
      headers: tenantScopedHeaders,
    });
    assertCondition(scopedRead.ok, `request failure: ${scopedRead.error || 'network error'}`, errors);
    if (scopedRead.ok) {
      assertCondition(scopedRead.status === 200, `expected 200 for canonical activeTenantId context, got ${scopedRead.status}`, errors);
      assertCondition(scopedRead.body?.code === 'TENANT_SCOPE_APPLIED', 'expected TENANT_SCOPE_APPLIED', errors);
    }

    const spoofedActiveTenantRead = await requestJson('GET', '/api/v1/platform/_kernel/tenancy/repository-check', {
      headers: {
        ...tenantScopedHeaders,
        'x-active-tenant-id': `tenant-${randomUUID()}`,
      },
    });
    assertCondition(
      spoofedActiveTenantRead.ok,
      `request failure: ${spoofedActiveTenantRead.error || 'network error'}`,
      errors
    );
    if (spoofedActiveTenantRead.ok) {
      assertCondition(
        spoofedActiveTenantRead.status === 403,
        `expected 403 for spoofed x-active-tenant-id, got ${spoofedActiveTenantRead.status}`,
        errors
      );
      assertCondition(
        spoofedActiveTenantRead.body?.code === 'TENANT_SCOPE_VIOLATION',
        'expected TENANT_SCOPE_VIOLATION for spoofed x-active-tenant-id',
        errors
      );
    }

    return {
      pass: errors.length === 0,
      evidence: errors.length ? errors : ['activeTenantId context and membership guard checks passed']
    };
  });

  await runGateCheck('globalEmailUniqueness', async () => {
    const errors = [];
    const uniquenessContractResult = await requestJson(
      'GET',
      '/api/v1/platform/_kernel/contracts/identity/global-email-uniqueness',
      { headers: defaultHeaders }
    );

    assertCondition(
      uniquenessContractResult.ok,
      `request failure: ${uniquenessContractResult.error || 'network error'}`,
      errors
    );
    if (uniquenessContractResult.ok) {
      assertCondition(
        uniquenessContractResult.status === 200,
        `expected 200 for global email uniqueness contract, got ${uniquenessContractResult.status}`,
        errors
      );
      assertCondition(
        uniquenessContractResult.body?.ok === true,
        'expected ok=true for global email uniqueness contract',
        errors
      );
      assertCondition(
        uniquenessContractResult.body?.code === 'GLOBAL_EMAIL_UNIQUENESS_CONTRACT_VALIDATED',
        'expected GLOBAL_EMAIL_UNIQUENESS_CONTRACT_VALIDATED',
        errors
      );
      assertCondition(
        uniquenessContractResult.body?.contract?.allPassed === true,
        'expected contract.allPassed=true for global email uniqueness',
        errors
      );
    }

    return {
      pass: errors.length === 0,
      evidence: errors.length ? errors : ['global email uniqueness contract checks passed']
    };
  });

  const readinessGateResults = {};
  for (const gate of requiredReadinessGates) {
    readinessGateResults[gate] = gateEvidence[gate]?.pass ? 'pass' : 'fail';
  }

  const allReadinessPassed = requiredReadinessGates.every((gate) => readinessGateResults[gate] === 'pass');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const report = {
    timestamp_utc: new Date().toISOString(),
    gate: 'epic-0-quality',
    pass: allReadinessPassed,
    failure_count: failures.length,
    warning_count: warnings.length,
    failures,
    warnings,
    phase0_readiness: {
      story_id: '0-10',
      required_gates: requiredReadinessGates,
      all_passed: allReadinessPassed,
      gate_results: readinessGateResults,
      gate_evidence: gateEvidence,
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  if (warnings.length) {
    console.log('Epic 0 quality warnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (!allReadinessPassed) {
    console.error('Epic 0 quality gate failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('Epic 0 quality gate passed');
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Epic 0 quality gate failed:');
  console.error(`- ${message}`);
  process.exit(1);
});
NODE
