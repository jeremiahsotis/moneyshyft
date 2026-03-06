import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '../../support/fixtures/kernelReadinessContext.fixture';
import { apiRequest } from '../../support/helpers/apiClient';
import type { KernelReadinessContext } from '../../support/factories/kernelReadinessContextFactory';

type ScriptRunResult = {
  status: number;
  output: string;
};

function runScript(command: string, args: string[], env: Record<string, string> = {}): ScriptRunResult {
  try {
    const output = execFileSync(command, args, {
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf8',
    });

    return {
      status: 0,
      output,
    };
  } catch (error) {
    const typed = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: typed.status ?? 1,
      output: `${typed.stdout ?? ''}${typed.stderr ?? ''}`,
    };
  }
}

function toAbsolutePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function writeJsonFile(filePath: string, payload: unknown): void {
  const absolutePath = toAbsolutePath(filePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runQualityGateScript(kernelReadinessContext: KernelReadinessContext): Record<string, unknown> {
  const result = runScript('bash', [kernelReadinessContext.qualityGateScript], {
    EPIC0_QUALITY_REPORT_PATH: kernelReadinessContext.readinessReportPath,
  });

  expect(result.status).toBe(0);
  return JSON.parse(readFileSync(toAbsolutePath(kernelReadinessContext.readinessReportPath), 'utf8')) as Record<string, unknown>;
}

test.describe('Story 0.10 atdd - kernel readiness verification suite API coverage', () => {
  test('[P0] verifies canonical kernel readiness gates in a single readiness contract @P0', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given runtime kernel evidence exists from the Epic-0 quality gate script
    runQualityGateScript(kernelReadinessContext);

    // When readiness verification is requested for Story 0.10
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessVerifyPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        requiredGates: kernelReadinessContext.requiredGates,
        readinessReportPath: kernelReadinessContext.readinessReportPath,
      },
    });

    // Then the readiness contract should confirm all kernel gates pass
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      code: 'KERNEL_READINESS_VERIFIED',
      readiness: {
        allPassed: true,
        gates: {
          tenancy: { status: 'pass' },
          auth: { status: 'pass' },
          csrf: { status: 'pass' },
          envelope: { status: 'pass' },
          eventOutbox: { status: 'pass' },
          timezone: { status: 'pass' },
          rbac: { status: 'pass' },
          activeTenantMembership: { status: 'pass' },
          globalEmailUniqueness: { status: 'pass' },
        },
        evidence: {
          reportPath: kernelReadinessContext.readinessReportPath,
        },
      },
    });

    expect(typeof body.readiness.checkedAt).toBe('string');
    expect(typeof body.readiness.evidence.reportHash).toBe('string');
  });

  test('[P0] returns refusal contract with failing gate list when report evidence contains failed gates @P0', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given a readiness report where one mandatory gate failed
    const report = runQualityGateScript(kernelReadinessContext) as {
      pass?: boolean;
      failure_count?: number;
      failures?: string[];
      phase0_readiness?: {
        all_passed?: boolean;
        gate_results?: Record<string, string>;
      };
    };
    report.pass = false;
    report.failure_count = 1;
    report.failures = ['Phase-0 readiness gate failed: csrf'];
    if (report.phase0_readiness) {
      report.phase0_readiness.all_passed = false;
      report.phase0_readiness.gate_results = {
        ...(report.phase0_readiness.gate_results || {}),
        csrf: 'fail',
      };
    }
    writeJsonFile(kernelReadinessContext.readinessReportPath, report);

    // When readiness verification is requested
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessVerifyPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        requiredGates: kernelReadinessContext.requiredGates,
        readinessReportPath: kernelReadinessContext.readinessReportPath,
      },
    });

    // Then the suite should return a refusal contract with failing-gate evidence
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      ok: false,
      code: 'KERNEL_READINESS_GATE_FAILURE',
      refusalType: 'business',
      readiness: {
        allPassed: false,
        failingGates: ['csrf'],
      },
      routeExecutionAllowed: false,
    });
  });

  test('[P1] records Phase-0 completion status only after successful readiness verification @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given runtime readiness evidence exists and verification succeeds first
    runQualityGateScript(kernelReadinessContext);
    const verifyResponse = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessVerifyPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        readinessReportPath: kernelReadinessContext.readinessReportPath,
      },
    });
    expect(verifyResponse.status()).toBe(200);

    // When Phase-0 completion is recorded for release gating
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessRecordPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        verifiedBy: 'epic-0-quality-gate',
        readinessReportPath: kernelReadinessContext.readinessReportPath,
        statusFilePath: kernelReadinessContext.phase0StatusFile,
      },
    });

    // Then readiness status should be persisted and Route story execution allowed
    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      code: 'PHASE0_READINESS_RECORDED',
      readiness: {
        phase0Status: 'complete',
        storyId: '0-10',
      },
      statusRecord: {
        filePath: kernelReadinessContext.phase0StatusFile,
        readinessReportPath: kernelReadinessContext.readinessReportPath,
      },
      routeExecution: {
        allowed: true,
      },
    });

    expect(typeof body.statusRecord.readinessReportHash).toBe('string');
    expect(typeof body.statusRecord.recordedAt).toBe('string');
  });

  test('[P1] refuses readiness verification when unknown gate identifiers are supplied @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given the caller requests readiness verification with unsupported gate keys
    // When readiness verification runs against an invalid gate set
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessVerifyPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        requiredGates: [...kernelReadinessContext.requiredGates, 'unknownGate'],
        readinessReportPath: kernelReadinessContext.readinessReportPath,
      },
    });

    // Then request should be refused with explicit invalid-gate diagnostics
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'KERNEL_READINESS_INVALID_GATE_SET',
      invalidGates: ['unknownGate'],
    });
  });

  test('[P1] rejects readiness recording when readiness evidence has not been generated @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given no valid readiness report exists at the provided path
    // When Phase-0 completion is recorded
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessRecordPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        verifiedBy: 'epic-0-quality-gate',
        readinessReportPath: kernelReadinessContext.readinessReportPath,
        statusFilePath: kernelReadinessContext.phase0StatusFile,
      },
    });

    // Then recording should be blocked until valid readiness evidence is available
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'PHASE0_READINESS_EVIDENCE_REQUIRED',
      routeExecution: {
        allowed: false,
      },
    });
  });

  test('[P1] keeps Phase-0 readiness recording idempotent across repeated submissions @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given a valid readiness completion payload with runtime evidence
    runQualityGateScript(kernelReadinessContext);
    const payload = {
      storyId: kernelReadinessContext.storyId,
      verifiedBy: 'epic-0-quality-gate',
      readinessReportPath: kernelReadinessContext.readinessReportPath,
      statusFilePath: kernelReadinessContext.phase0StatusFile,
    };

    // When readiness is recorded more than once
    const firstResponse = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessRecordPath,
      headers: kernelReadinessContext.headers,
      data: payload,
    });
    const secondResponse = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessRecordPath,
      headers: kernelReadinessContext.headers,
      data: payload,
    });

    // Then first write should create the record and second write should be idempotent
    expect(firstResponse.status()).toBe(201);
    expect(secondResponse.status()).toBe(200);
    const secondBody = await secondResponse.json();
    expect(secondBody).toMatchObject({
      ok: true,
      code: 'PHASE0_READINESS_ALREADY_RECORDED',
      readiness: {
        phase0Status: 'complete',
        storyId: kernelReadinessContext.storyId,
      },
      routeExecution: {
        allowed: true,
      },
    });
  });
});
