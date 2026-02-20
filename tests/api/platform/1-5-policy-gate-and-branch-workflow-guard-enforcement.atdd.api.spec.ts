import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test, expect } from '../../support/fixtures/policyWorkflowGuardStory15.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';
import { runBranchWorkflowGuardInTempRepo } from '../../support/utils/branchWorkflowGuardTestHarness';

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

test.describe('Story 1.5 Policy Gate and Branch Workflow Guard Enforcement (ATDD API RED)', () => {
  test.skip(
    '[P0] blocks downstream CI quality lanes behind a policy-first dependency chain and runs policy:check as the first gate @P0',
    async ({ story15Context }) => {
      const workflow = readFileSync(story15Context.workflowFile, 'utf8');
      const policyJob = getJobBlock(workflow, 'policy');
      const lintNeedsPolicy = getNeeds(getJobBlock(workflow, 'lint')).includes('policy');
      const testNeedsLint = getNeeds(getJobBlock(workflow, 'test')).includes('lint');
      const burnInNeedsTest = getNeeds(getJobBlock(workflow, 'burn-in')).includes('test');
      const qualityGateNeeds = getNeeds(getJobBlock(workflow, 'quality-gates'));
      const qualityGatesNeedsTestAndBurnIn =
        qualityGateNeeds.includes('test') && qualityGateNeeds.includes('burn-in');
      const policyRunsGate = /\n\s*run:\s*npm run policy:check\b/.test(policyJob);

      expect(
        policyJob.length > 0 &&
          policyRunsGate &&
          lintNeedsPolicy &&
          testNeedsLint &&
          burnInNeedsTest &&
          qualityGatesNeedsTestAndBurnIn,
      ).toBe(true);
    },
  );

  test.skip(
    '[P0] rejects local runs on protected default branches with concrete policy reference and remediation commands @P0',
    async ({ story15Context }) => {
      const { output, status } = runPolicyScriptInTempRepo(story15Context.policyScript, story15Context.policyFile, {
        branch: 'codex/dev',
        event: 'local',
        headRef: story15Context.storyBranch,
        commitSubject: '1-5: red-phase policy diagnostics',
      });

      const hasFailureHeadline = /Policy check failed: branch-first policy requires a non-default branch/.test(output);
      const hasPolicyReference = /Policy reference:\s*docs\/policies\/git_policy\.md/.test(output);
      const hasRemediationStartStory = /npm run start:story-branch -- <story-id> <story-slug>/.test(output);
      const hasRemediationEnsureWorkflow =
        /npm run branch:ensure-workflow -- --workflow dev-story --story <story-key-or-story-file>/.test(output);

      expect(
        status !== 0 &&
          hasFailureHeadline &&
          hasPolicyReference &&
          hasRemediationStartStory &&
          hasRemediationEnsureWorkflow,
      ).toBe(true);
    },
  );

  test.skip(
    '[P0] enforces story workflow branch alignment for ATDD and reports exact expected branch pattern on mismatch @P0',
    async ({ story15Context }) => {
      const { output, status } = runBranchWorkflowGuardInTempRepo(story15Context.branchGuardScript, {
        branch: 'codex/story-1-4-shared-response-envelope-and-refusal-helpers',
        workflow: '_bmad/tea/workflows/testarch/atdd/workflow.yaml',
        story: story15Context.storyFile,
      });

      const hasFailurePrefix = /Branch guard failed/.test(output);
      const hasExpectedPattern = /Expected branch pattern:\s*codex\/story-1-5-<slug>/.test(output);
      const hasCurrentBranch = /Current branch:\s*codex\/story-1-4-shared-response-envelope-and-refusal-helpers/.test(
        output,
      );

      expect(status !== 0 && hasFailurePrefix && hasExpectedPattern && hasCurrentBranch).toBe(true);
    },
  );

  test.skip('[P1] enforces epic workflow branch naming and rejects non-matching epic ops branches @P1', async ({
    story15Context,
  }) => {
    const { output, status } = runBranchWorkflowGuardInTempRepo(story15Context.branchGuardScript, {
      branch: 'codex/story-1-5-policy-gate-and-branch-workflow-guard-enforcement',
      workflow: 'sprint-planning',
      epic: '1',
    });

    const hasFailurePrefix = /Branch guard failed/.test(output);
    const hasExpectedBranch = /Expected branch:\s*codex\/epic-1-ops/.test(output);
    const hasCurrentBranch = /Current branch:\s*codex\/story-1-5-policy-gate-and-branch-workflow-guard-enforcement/.test(
      output,
    );

    expect(status !== 0 && hasFailurePrefix && hasExpectedBranch && hasCurrentBranch).toBe(true);
  });

  test.skip(
    '[P1] blocks story workflows when required --story argument is omitted and returns explicit diagnostics @P1',
    async ({ story15Context }) => {
      let output = '';
      try {
        execFileSync('bash', [story15Context.branchGuardScript, '--workflow', 'atdd'], {
          env: {
            ...process.env,
            GITHUB_EVENT_NAME: 'local',
          },
          encoding: 'utf8',
        });
      } catch (error) {
        const typed = error as { stdout?: string; stderr?: string };
        output = `${typed.stdout ?? ''}${typed.stderr ?? ''}`;
      }

      expect(/Story workflow requires --story/.test(output)).toBe(true);
    },
  );
});
