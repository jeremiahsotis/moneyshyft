import { readFileSync } from 'node:fs';
import { test, expect } from '../../support/fixtures/connectShyftStoryE6.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';
import { runBranchWorkflowGuardInTempRepo } from '../../support/utils/branchWorkflowGuardTestHarness';

test.describe(
  'Story e.6 Parallel Delivery Safety Gates for ConnectShyft Rollout (ATDD E2E RED)',
  () => {
    test(
      '[E6-ATDD-E2E-001][P1] maintainer journey fails fast on protected branches and provides story-branch remediation plus workflow-guard diagnostics @P1',
      async ({ storyE6Context }) => {
        const policyResult = runPolicyScriptInTempRepo(
          storyE6Context.policyScript,
          storyE6Context.policyFile,
          {
            branch: 'codex/dev',
            event: 'local',
            headRef: storyE6Context.storyBranch,
            commitSubject: 'e-6: policy-first rollout safety diagnostics',
            env: {
              PROJECT_LANE: 'connectshyft',
            },
          },
        );

        const branchGuardResult = runBranchWorkflowGuardInTempRepo(
          storyE6Context.branchGuardScript,
          {
            branch:
              'codex/story-e-5-connectshyft-replay-safe-webhook-receipt-ledger-and-retention-controls',
            workflow: '_bmad/tea/workflows/testarch/atdd/workflow.yaml',
            story: storyE6Context.storyFile,
            env: {
              PROJECT_LANE: 'connectshyft',
            },
          },
        );

        const policyHasActionableRecovery =
          policyResult.status !== 0
          && /branch-first policy requires a non-default branch/.test(policyResult.output)
          && /npm run start:story-branch -- <story-id> <story-slug>/.test(policyResult.output)
          && /Policy reference:\s*docs\/policies\/git_policy\.md/.test(policyResult.output);
        const branchGuardHasExpectedPattern =
          branchGuardResult.status !== 0
          && /Expected branch pattern:\s*codex\/story-e-6-connectshyft-<slug>/.test(
            branchGuardResult.output,
          )
          && /Current branch:\s*codex\/story-e-5-connectshyft-replay-safe-webhook-receipt-ledger-and-retention-controls/.test(
            branchGuardResult.output,
          );

        expect(policyHasActionableRecovery && branchGuardHasExpectedPattern).toBe(true);
      },
    );

    test(
      '[E6-ATDD-E2E-002][P0] release-readiness summary blocks merge when ConnectShyft quality gates or RouteShyft regression lane are incomplete @P0',
      async ({ storyE6Context }) => {
        const workflow = readFileSync(storyE6Context.workflowFile, 'utf8');
        const burnInWorkflow = readFileSync(storyE6Context.burnInWorkflowFile, 'utf8');

        const releaseSummaryTracksPolicy = /blocked_jobs\+\=\("policy"\)/.test(workflow);
        const releaseSummaryTracksQualityGates = /blocked_jobs\+\=\("quality-gates"\)/.test(workflow);
        const releaseSummaryTracksRouteRegression = /blocked_jobs\+\=\("burn-in"\)/.test(workflow);
        const burnInWorkflowTriggeredByCi = /workflows:\s*\['RouteShyft CI'\]/.test(
          burnInWorkflow,
        );
        const burnInPullRequestFlowExists = /run\.event === 'pull_request'/.test(
          burnInWorkflow,
        );

        expect(
          releaseSummaryTracksPolicy
            && releaseSummaryTracksQualityGates
            && releaseSummaryTracksRouteRegression
            && burnInWorkflowTriggeredByCi
            && burnInPullRequestFlowExists,
        ).toBe(true);
      },
    );

    test(
      '[E6-ATDD-E2E-003][P1] operator release-playbook journey keeps allow-list controls and rollback references synchronized across deployment docs and provider rollout contracts @P1',
      async ({ storyE6Context }) => {
        const deploymentChecklist = readFileSync(storyE6Context.deploymentChecklistFile, 'utf8');
        const productionGuide = readFileSync(storyE6Context.productionGuideFile, 'utf8');
        const providerRegistry = readFileSync(storyE6Context.providerRegistryFile, 'utf8');

        const hasQuickRollbackInstructions =
          /Quick Rollback:/.test(deploymentChecklist)
          && /Rollback Step 4/.test(deploymentChecklist);
        const hasDetailedRollbackRunbook = /## Rollback Procedure/.test(productionGuide);
        const hasProviderAllowlistControls =
          /CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST/.test(providerRegistry)
          && /x-test-connectshyft-provider-rollout-allowlist/.test(providerRegistry)
          && /provider-not-allowlisted/.test(providerRegistry);

        expect(
          hasQuickRollbackInstructions
            && hasDetailedRollbackRunbook
            && hasProviderAllowlistControls,
        ).toBe(true);
      },
    );
  },
);
