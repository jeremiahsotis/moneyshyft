import { randomUUID } from 'node:crypto';

export type KernelGateName =
  | 'tenancy'
  | 'auth'
  | 'csrf'
  | 'envelope'
  | 'eventOutbox'
  | 'timezone';

export type KernelReadinessContext = {
  storyId: string;
  routeStoryFile: string;
  routeStoryBranch: string;
  routeWorkflow: string;
  qualityGateScript: string;
  branchGuardScript: string;
  phase0StatusFile: string;
  readinessReportPath: string;
  readinessVerifyPath: string;
  readinessRecordPath: string;
  readinessApiSpecPath: string;
  requiredGates: KernelGateName[];
  headers: Record<string, string>;
};

export function createKernelReadinessContext(
  overrides: Partial<KernelReadinessContext> = {},
): KernelReadinessContext {
  const runId = randomUUID();
  const tenantId = `tenant-${randomUUID()}`;
  const correlationId = `corr-${randomUUID()}`;
  const csrfToken = `csrf-${randomUUID()}`;

  return {
    storyId: '0-10',
    routeStoryFile:
      '_bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md',
    routeStoryBranch: 'codex/story-1-1-tenant-context-resolution-and-isolation-guardrails',
    routeWorkflow: 'dev-story',
    qualityGateScript: 'scripts/quality-gates-epic0.sh',
    branchGuardScript: 'scripts/branch-ensure-workflow.sh',
    phase0StatusFile: `tests/artifacts/gates/phase0-readiness-${runId}.json`,
    readinessReportPath: `tests/artifacts/gates/epic-0-quality-${runId}.json`,
    readinessVerifyPath: '/api/v1/platform/_kernel/readiness/verify',
    readinessRecordPath: '/api/v1/platform/_kernel/readiness/record-phase0-complete',
    readinessApiSpecPath: 'tests/api/platform/kernel-readiness-verification-suite.api.spec.ts',
    requiredGates: ['tenancy', 'auth', 'csrf', 'envelope', 'eventOutbox', 'timezone'],
    headers: {
      'x-tenant-id': tenantId,
      'x-correlation-id': correlationId,
      'x-csrf-token': csrfToken,
    },
    ...overrides,
  };
}
