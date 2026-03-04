import { readFileSync } from 'node:fs';
import { test, expect } from '../../support/fixtures/connectShyftStoryE6.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getJobBlock(workflow: string, jobName: string): string {
  const pattern = new RegExp(
    `(?:^|\\n)\\s{2}${escapeRegex(jobName)}:\\s*\\n([\\s\\S]*?)(?=\\n\\s{2}[A-Za-z0-9_-]+:\\s*\\n|$)`,
  );
  const match = workflow.match(pattern);
  return match?.[1] ?? '';
}

function getNeeds(jobBlock: string): string[] {
  const inlineNeeds = jobBlock.match(/^\s{4}needs:\s*([^\n]+)\s*$/m);
  if (inlineNeeds) {
    const value = inlineNeeds[1].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      return value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value ? [value] : [];
  }

  const multilineNeeds = jobBlock.match(/^\s{4}needs:\s*\n((?:\s{6}-\s*[^\n]+\n?)+)/m);
  if (!multilineNeeds) return [];

  return multilineNeeds[1]
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s{6}-\s*([^\n]+)/);
      return match ? match[1].trim() : '';
    })
    .filter(Boolean);
}

test.describe(
  'Story e.6 Parallel Delivery Safety Gates for ConnectShyft Rollout (ATDD API RED)',
  () => {
    test(
      '[E6-ATDD-API-001][P0] ConnectShyft CI executes npm run policy:check as the first blocking gate before lint/test quality stages @P0',
      async ({ storyE6Context }) => {
        const workflow = readFileSync(storyE6Context.workflowFile, 'utf8');
        const policyJob = getJobBlock(workflow, 'policy');
        const lintNeedsPolicy = getNeeds(getJobBlock(workflow, 'lint')).includes('policy');
        const testNeedsLint = getNeeds(getJobBlock(workflow, 'test')).includes('lint');
        const qualityNeedsTest = getNeeds(getJobBlock(workflow, 'quality-gates')).includes('test');
        const policyRunsGate = /\n\s*run:\s*npm run policy:check\b/.test(policyJob);

        expect(
          policyJob.length > 0
            && policyRunsGate
            && lintNeedsPolicy
            && testNeedsLint
            && qualityNeedsTest,
        ).toBe(true);
      },
    );

    test(
      '[E6-ATDD-API-002][P0] policy checks block provider-coupled bypass paths and route/connectshyft boundary violations deterministically @P0',
      async ({ storyE6Context }) => {
        const providerCouplingResult = runPolicyScriptInTempRepo(
          storyE6Context.policyScript,
          storyE6Context.policyFile,
          {
            branch: storyE6Context.storyBranch,
            event: 'local',
            commitSubject: 'e-6: enforce parallel delivery safety guardrails',
            env: {
              PROJECT_LANE: 'connectshyft',
            },
            seedFiles: {
              'src/src/modules/connectshyft/twilio-direct-coupling-e6.ts': [
                "import twilio from 'twilio';",
                '',
                "export const createDirectProviderClient = () => twilio('sid', 'token');",
                '',
              ].join('\n'),
            },
          },
        );

        const boundaryViolationResult = runPolicyScriptInTempRepo(
          storyE6Context.policyScript,
          storyE6Context.policyFile,
          {
            branch: storyE6Context.storyBranch,
            event: 'local',
            commitSubject: 'e-6: enforce module boundary policy contracts',
            env: {
              PROJECT_LANE: 'connectshyft',
            },
            seedFiles: {
              'src/src/modules/connectshyft/route-boundary-violation-e6.ts': [
                "import { CommitmentService } from '../route/application/commitmentService';",
                '',
                'export const leakingBoundaryReference = CommitmentService;',
                '',
              ].join('\n'),
            },
          },
        );

        const providerGuardFailed =
          providerCouplingResult.status !== 0
          && /ConnectShyft provider abstraction guard failed/.test(providerCouplingResult.output)
          && /twilio-direct-coupling-e6\.ts/.test(providerCouplingResult.output);
        const boundaryGuardFailed =
          boundaryViolationResult.status !== 0
          && /(boundary|cross-module|import-boundary)/i.test(boundaryViolationResult.output);

        expect(providerGuardFailed && boundaryGuardFailed).toBe(true);
      },
    );

    test(
      '[E6-ATDD-API-003][P0] merge gating enforces both RouteShyft regression lane completion and ConnectShyft quality gates before release-readiness turns ready @P0',
      async ({ storyE6Context }) => {
        const workflow = readFileSync(storyE6Context.workflowFile, 'utf8');
        const burnInWorkflow = readFileSync(storyE6Context.burnInWorkflowFile, 'utf8');

        const qualityGateNeeds = getNeeds(getJobBlock(workflow, 'quality-gates'));
        const qualityNeedsBurnIn = qualityGateNeeds.includes('burn-in');
        const releaseReadinessTracksBurnIn =
          /blocked_jobs\+\=\("burn-in"\)/.test(workflow)
          || /needs\['burn-in'\]\.result/.test(workflow);
        const burnInRunsOnCiCompletion =
          /workflow_run:\s*\n\s*workflows:\s*\['RouteShyft CI'\]\s*\n\s*types:\s*\[completed\]/.test(
            burnInWorkflow,
          );
        const burnInHasPrPath = /run\.event === 'pull_request'/.test(burnInWorkflow);

        expect(
          qualityNeedsBurnIn
            && releaseReadinessTracksBurnIn
            && burnInRunsOnCiCompletion
            && burnInHasPrPath,
        ).toBe(true);
      },
    );

    test(
      '[E6-ATDD-API-004][P1] rollout controls keep feature-flag allow-list gates explicit and rollback playbooks current and testable @P1',
      async ({ storyE6Context }) => {
        const providerRegistry = readFileSync(storyE6Context.providerRegistryFile, 'utf8');
        const providerRegistryTests = readFileSync(storyE6Context.providerRegistryTestFile, 'utf8');
        const deploymentChecklist = readFileSync(storyE6Context.deploymentChecklistFile, 'utf8');
        const productionGuide = readFileSync(storyE6Context.productionGuideFile, 'utf8');

        const hasAllowlistEnv = /CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST/.test(providerRegistry);
        const hasFailClosedAllowlistBehavior =
          /Provider rollout allow-list configuration is invalid\. Cutover is fail-closed until corrected\./.test(
            providerRegistry,
          );
        const hasAllowlistContractCoverage =
          /fails closed when rollout allow-list excludes the request tenant\/orgUnit context/.test(
            providerRegistryTests,
          )
          && /allows resolution when rollout allow-list includes the request tenant\/orgUnit context/.test(
            providerRegistryTests,
          )
          && /fails closed when rollout allow-list configuration is invalid JSON/.test(
            providerRegistryTests,
          );
        const hasRollbackDocs =
          /Quick Rollback:/.test(deploymentChecklist)
          && /See PRODUCTION_DEPLOYMENT_GUIDE\.md → Rollback Step 4/.test(deploymentChecklist)
          && /## Rollback Procedure/.test(productionGuide);

        expect(
          hasAllowlistEnv
            && hasFailClosedAllowlistBehavior
            && hasAllowlistContractCoverage
            && hasRollbackDocs,
        ).toBe(true);
      },
    );
  },
);
