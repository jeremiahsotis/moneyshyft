import { test, expect } from '../../support/fixtures/kernelReadinessContext.fixture';
import { apiRequest } from '../../support/helpers/apiClient';

test.describe('Story 0.10 atdd - kernel readiness verification suite API coverage', () => {
  test.skip('[P0] verifies tenancy/auth/csrf/envelope/event-outbox/timezone gates in a single readiness contract @P0', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given Phase-0 kernel gate requirements for Story 0.10
    // When readiness verification is requested for all required gates
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessVerifyPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        requiredGates: kernelReadinessContext.requiredGates,
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
        },
        evidence: {
          reportPath: kernelReadinessContext.readinessReportPath,
        },
      },
    });

    expect(typeof body.readiness.checkedAt).toBe('string');
  });

  test.skip('[P0] returns refusal contract with failing gate list when readiness verification does not pass @P0', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given one mandatory kernel gate fails during verification
    // When readiness verification is requested with a forced gate failure
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessVerifyPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        requiredGates: kernelReadinessContext.requiredGates,
        simulateFailures: ['csrf'],
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

  test.skip('[P1] records Phase-0 completion status and route-execution eligibility after successful readiness verification @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given all kernel gates are verified successfully
    // When Phase-0 completion is recorded for release gating
    const response = await apiRequest(request, {
      method: 'POST',
      path: kernelReadinessContext.readinessRecordPath,
      headers: kernelReadinessContext.headers,
      data: {
        storyId: kernelReadinessContext.storyId,
        verifiedBy: 'epic-0-quality-gate',
        readinessReportPath: kernelReadinessContext.readinessReportPath,
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
      },
      routeExecution: {
        allowed: true,
      },
    });

    expect(typeof body.statusRecord.recordedAt).toBe('string');
  });

  test.skip('[P1] refuses readiness verification when unknown gate identifiers are supplied @P1', async ({
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

  test.skip('[P1] keeps Phase-0 readiness recording idempotent across repeated submissions @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given a valid readiness completion payload
    const payload = {
      storyId: kernelReadinessContext.storyId,
      verifiedBy: 'epic-0-quality-gate',
      readinessReportPath: kernelReadinessContext.readinessReportPath,
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
