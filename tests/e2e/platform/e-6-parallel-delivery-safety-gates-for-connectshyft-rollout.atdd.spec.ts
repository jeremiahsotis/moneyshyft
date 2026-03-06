import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '../../support/fixtures/connectShyftStoryE6.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';
import { runBranchWorkflowGuardInTempRepo } from '../../support/utils/branchWorkflowGuardTestHarness';

type ReleaseReadinessInputs = {
  policy: string;
  lint: string;
  runHeavyCi: 'true' | 'false';
  test: string;
  burnIn: string;
  qualityGates: string;
};

function extractReleaseReadinessRunScript(workflow: string): string {
  const match = workflow.match(
    /id:\s*release_readiness[\s\S]*?run:\s*\|\n([\s\S]*?)\n\s*- name:\s*Publish summary/,
  );

  if (!match?.[1]) {
    return '';
  }

  const lines = match[1].split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => line.match(/^(\s*)/)?.[1]?.length ?? 0),
  );

  return lines.map((line) => line.slice(minIndent)).join('\n');
}

function renderReleaseReadinessScript(
  template: string,
  inputs: ReleaseReadinessInputs,
): string {
  return template
    .replaceAll('${{ needs.policy.result }}', inputs.policy)
    .replaceAll('${{ needs.lint.result }}', inputs.lint)
    .replaceAll('${{ needs.changes.outputs.run_heavy_ci }}', inputs.runHeavyCi)
    .replaceAll('${{ needs.test.result }}', inputs.test)
    .replaceAll("${{ needs['burn-in'].result }}", inputs.burnIn)
    .replaceAll("${{ needs['quality-gates'].result }}", inputs.qualityGates);
}

function executeReleaseReadinessScript(script: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'release-readiness-harness-'));
  const outputPath = join(tempDir, 'github_output.txt');
  try {
    execFileSync('bash', ['-lc', script], {
      cwd: tempDir,
      env: {
        ...process.env,
        GITHUB_OUTPUT: outputPath,
      },
      encoding: 'utf8',
    });
    return readFileSync(outputPath, 'utf8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

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

        expect(policyHasActionableRecovery).toBe(true);
        expect(branchGuardHasExpectedPattern).toBe(true);
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
        const ciBurnInHasDistinctName = /burn-in:\s*\n\s*name:\s*(burn-in|ci-burn-in)/.test(workflow);
        const scheduledBurnInHasDistinctName =
          /burn-in:\s*\n\s*name:\s*scheduled-burn-in/.test(burnInWorkflow);
        const burnInWorkflowTriggeredByCi = /workflows:\s*\['RouteShyft CI'\]/.test(
          burnInWorkflow,
        );
        const burnInPullRequestFlowExists = /run\.event === 'pull_request'/.test(
          burnInWorkflow,
        );

        expect(releaseSummaryTracksPolicy).toBe(true);
        expect(releaseSummaryTracksQualityGates).toBe(true);
        expect(releaseSummaryTracksRouteRegression).toBe(true);
        expect(ciBurnInHasDistinctName).toBe(true);
        expect(scheduledBurnInHasDistinctName).toBe(true);
        expect(burnInWorkflowTriggeredByCi).toBe(true);
        expect(burnInPullRequestFlowExists).toBe(true);
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

        expect(hasQuickRollbackInstructions).toBe(true);
        expect(hasDetailedRollbackRunbook).toBe(true);
        expect(hasProviderAllowlistControls).toBe(true);
      },
    );

    test(
      '[E6-ATDD-E2E-004][P0] release-readiness script resolves ready with no blockers when all required gates succeed in heavy CI mode @P0',
      async ({ storyE6Context }) => {
        const workflow = readFileSync(storyE6Context.workflowFile, 'utf8');
        const runScript = extractReleaseReadinessRunScript(workflow);

        expect(runScript.length).toBeGreaterThan(0);
        expect(runScript).toContain('blocked_jobs=()');
        expect(runScript).toContain('status=ready');
        expect(runScript).toContain('blocked_jobs=none');

        const renderedScript = renderReleaseReadinessScript(runScript, {
          policy: 'success',
          lint: 'success',
          runHeavyCi: 'true',
          test: 'success',
          burnIn: 'success',
          qualityGates: 'success',
        });

        const output = executeReleaseReadinessScript(renderedScript);
        expect(output).toContain('status=ready');
        expect(output).toContain('blocked_jobs=none');
      },
    );
  },
);
