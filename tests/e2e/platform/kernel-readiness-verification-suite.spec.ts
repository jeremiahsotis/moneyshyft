import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '../../support/fixtures/kernelReadinessContext.fixture';
import { apiRequest } from '../../support/helpers/apiClient';

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

function writeKernelReadySprintStatus(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    [
      'development_status:',
      '  0-10-kernel-readiness-verification-suite: done',
      'course_correction:',
      '  cc-2026-02-18:',
      '    status: approved',
      '',
    ].join('\n'),
    'utf8',
  );
}

test.describe('Story 0.10 atdd - kernel readiness verification suite release gating', () => {
  test('[P0] quality gate script emits explicit Phase-0 readiness matrix for all mandatory kernel controls @P0', async ({
    kernelReadinessContext,
  }) => {
    // Given the Epic-0 quality gate script is used to evaluate readiness
    const result = runScript('bash', [kernelReadinessContext.qualityGateScript], {
      EPIC0_QUALITY_REPORT_PATH: kernelReadinessContext.readinessReportPath,
    });
    expect(result.status).toBe(0);

    // When the quality gate report artifact is inspected
    const report = JSON.parse(readFileSync(kernelReadinessContext.readinessReportPath, 'utf8')) as Record<string, unknown>;

    // Then report should include explicit readiness matrix for all required kernel gates
    expect(report).toMatchObject({
      gate: 'epic-0-quality',
      pass: true,
      phase0_readiness: {
        required_gates: kernelReadinessContext.requiredGates,
        all_passed: true,
        gate_results: {
          tenancy: 'pass',
          auth: 'pass',
          csrf: 'pass',
          envelope: 'pass',
          eventOutbox: 'pass',
          timezone: 'pass',
        },
      },
    });
  });

  test('[P0] route-story workflow guard blocks execution when Phase-0 readiness is not yet recorded @P0', async ({
    kernelReadinessContext,
  }) => {
    // Given a Route story branch requests workflow execution before readiness is recorded
    writeKernelReadySprintStatus(kernelReadinessContext.sprintStatusFile);

    // When branch workflow guard validates route-story execution
    const result = runScript(
      'bash',
      [
        kernelReadinessContext.branchGuardScript,
        '--workflow',
        kernelReadinessContext.routeWorkflow,
        '--story',
        kernelReadinessContext.routeStoryFile,
      ],
      {
        GITHUB_HEAD_REF: kernelReadinessContext.routeStoryBranch,
        SPRINT_STATUS_FILE: kernelReadinessContext.sprintStatusFile,
        PHASE0_READINESS_STATUS_FILE: kernelReadinessContext.phase0StatusFile,
      },
    );

    // Then execution should be blocked with readiness-specific remediation guidance
    expect(result.status !== 0).toBe(true);
    expect(/Phase-0 readiness incomplete/.test(result.output)).toBe(true);
    expect(/Complete Story 0\.10 kernel readiness verification suite first/.test(result.output)).toBe(true);
  });

  test('[P1] route-story workflow guard allows execution after Phase-0 readiness is recorded @P1', async ({
    request,
    kernelReadinessContext,
  }) => {
    // Given runtime readiness evidence exists and Phase-0 readiness has been explicitly recorded
    writeKernelReadySprintStatus(kernelReadinessContext.sprintStatusFile);
    const qualityGateResult = runScript('bash', [kernelReadinessContext.qualityGateScript], {
      EPIC0_QUALITY_REPORT_PATH: kernelReadinessContext.readinessReportPath,
    });
    expect(qualityGateResult.status).toBe(0);

    const recordResponse = await apiRequest(request, {
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

    expect(recordResponse.status()).toBe(201);

    // When branch workflow guard validates route-story execution
    const result = runScript(
      'bash',
      [
        kernelReadinessContext.branchGuardScript,
        '--workflow',
        kernelReadinessContext.routeWorkflow,
        '--story',
        kernelReadinessContext.routeStoryFile,
      ],
      {
        GITHUB_HEAD_REF: kernelReadinessContext.routeStoryBranch,
        SPRINT_STATUS_FILE: kernelReadinessContext.sprintStatusFile,
        PHASE0_READINESS_STATUS_FILE: kernelReadinessContext.phase0StatusFile,
      },
    );

    // Then execution should be allowed with explicit readiness confirmation
    expect(result.status).toBe(0);
    expect(/Phase-0 readiness verified/.test(result.output)).toBe(true);
  });

  test('[P1] readiness matrix artifact keeps required gate ordering and complete gate keys @P1', async ({
    kernelReadinessContext,
  }) => {
    // Given the quality gate script emits readiness diagnostics
    const result = runScript('bash', [kernelReadinessContext.qualityGateScript], {
      EPIC0_QUALITY_REPORT_PATH: kernelReadinessContext.readinessReportPath,
    });
    expect(result.status).toBe(0);

    // When the generated readiness report is parsed
    const report = JSON.parse(readFileSync(kernelReadinessContext.readinessReportPath, 'utf8')) as {
      phase0_readiness?: {
        required_gates?: string[];
        gate_results?: Record<string, string>;
      };
    };

    // Then required gate ordering and gate-result keys should match canonical requirements
    expect(report.phase0_readiness?.required_gates).toEqual(kernelReadinessContext.requiredGates);
    expect(Object.keys(report.phase0_readiness?.gate_results ?? {})).toEqual(kernelReadinessContext.requiredGates);
  });

  test('[P1] route-story guard failure output includes explicit readiness remediation commands @P1', async ({
    kernelReadinessContext,
  }) => {
    // Given route-story workflow guard runs before readiness recording exists
    writeKernelReadySprintStatus(kernelReadinessContext.sprintStatusFile);
    const result = runScript(
      'bash',
      [
        kernelReadinessContext.branchGuardScript,
        '--workflow',
        kernelReadinessContext.routeWorkflow,
        '--story',
        kernelReadinessContext.routeStoryFile,
      ],
      {
        GITHUB_HEAD_REF: kernelReadinessContext.routeStoryBranch,
        SPRINT_STATUS_FILE: kernelReadinessContext.sprintStatusFile,
        PHASE0_READINESS_STATUS_FILE: kernelReadinessContext.phase0StatusFile,
      },
    );

    // When execution is blocked
    // Then remediation output should include explicit readiness verification + rerun commands
    expect(result.status !== 0).toBe(true);
    expect(new RegExp(`npm run test:e2e -- ${kernelReadinessContext.readinessApiSpecPath}`).test(result.output)).toBe(
      true,
    );
    expect(
      new RegExp(
        `npm run branch:ensure-workflow -- --workflow ${kernelReadinessContext.routeWorkflow} --story ${kernelReadinessContext.routeStoryFile}`,
      ).test(result.output),
    ).toBe(true);
  });
});
