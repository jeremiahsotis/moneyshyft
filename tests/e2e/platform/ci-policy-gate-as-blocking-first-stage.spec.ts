import { readFileSync } from 'node:fs';
import { test, expect } from '../../support/fixtures/ciPolicyContext.fixture';
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

test.describe('Story 0.9 atdd - ci policy gate as blocking first stage', () => {
  test('[P0] defines required policy-first quality-stage jobs in the CI graph @P0', async ({ ciPolicyContext }) => {
    // Given the CI workflow graph definition
    const workflow = readFileSync(ciPolicyContext.workflowFile, 'utf8');
    const splitBurnInWorkflow = readFileSync('.github/workflows/burn-in.yml', 'utf8');

    // When evaluating required stage presence and policy gate command
    const policyJob = getJobBlock(workflow, 'policy');
    const lintJob = getJobBlock(workflow, 'lint');
    const testJob = getJobBlock(workflow, 'test');
    const burnInJob = getJobBlock(workflow, 'burn-in');
    const splitBurnInJob = getJobBlock(splitBurnInWorkflow, 'burn-in');
    const qualityGatesJob = getJobBlock(workflow, 'quality-gates');
    const policyRunsGate = /\n\s*run:\s*npm run policy:check\b/.test(policyJob);
    const splitBurnInWorkflowRunTrigger =
      /workflow_run:\s*\n\s*workflows:\s*\['RouteShyft CI'\]\s*\n\s*types:\s*\[completed\]/.test(splitBurnInWorkflow);
    const burnInDefined = burnInJob.length > 0 || (splitBurnInJob.length > 0 && splitBurnInWorkflowRunTrigger);
    const pullRequestIncludesProduction = /pull_request:\s*\n\s*branches:\s*\[[^\]]*\bproduction\b/.test(workflow);
    const pullRequestIncludesCodexDev = /pull_request:\s*\n\s*branches:\s*\[[^\]]*\bcodex\/dev\b/.test(workflow);

    // Then CI should define all required quality jobs and run policy:check in policy stage
    expect(
      policyJob.length > 0 &&
        lintJob.length > 0 &&
        testJob.length > 0 &&
        burnInDefined &&
        qualityGatesJob.length > 0 &&
        policyRunsGate &&
        pullRequestIncludesProduction &&
        pullRequestIncludesCodexDev,
    ).toBe(true);
  });

  test('[P0] blocks lint, test, burn-in, and quality-gates through explicit dependency graph edges @P0', async ({
    ciPolicyContext,
  }) => {
    // Given the CI workflow graph definition
    const workflow = readFileSync(ciPolicyContext.workflowFile, 'utf8');
    const splitBurnInWorkflow = readFileSync('.github/workflows/burn-in.yml', 'utf8');

    // When evaluating dependency relationships for quality stages
    const lintNeedsPolicy = getNeeds(getJobBlock(workflow, 'lint')).includes('policy');
    const testNeedsLint = getNeeds(getJobBlock(workflow, 'test')).includes('lint');
    const inlineBurnInNeedsTest = getNeeds(getJobBlock(workflow, 'burn-in')).includes('test');
    const qualityGateNeeds = getNeeds(getJobBlock(workflow, 'quality-gates'));
    const qualityGatesNeedsTest = qualityGateNeeds.includes('test');
    const qualityGatesNeedsBurnIn = qualityGateNeeds.includes('burn-in');
    const splitBurnInWorkflowRunTrigger =
      /workflow_run:\s*\n\s*workflows:\s*\['RouteShyft CI'\]\s*\n\s*types:\s*\[completed\]/.test(splitBurnInWorkflow);
    const splitBurnInNeedsPrepare = getNeeds(getJobBlock(splitBurnInWorkflow, 'burn-in')).includes('prepare');
    const inlineBurnInGraph = inlineBurnInNeedsTest && qualityGatesNeedsTest && qualityGatesNeedsBurnIn;
    const splitBurnInGraph =
      qualityGatesNeedsTest &&
      !qualityGatesNeedsBurnIn &&
      splitBurnInWorkflowRunTrigger &&
      splitBurnInNeedsPrepare;

    // Then lint/test/burn-in/gates should not proceed when policy fails
    expect(lintNeedsPolicy && testNeedsLint && (inlineBurnInGraph || splitBurnInGraph)).toBe(true);
  });

  test('[P1] quality-gates execution condition enforces successful upstream dependencies @P1', async ({
    ciPolicyContext,
  }) => {
    // Given quality gate job definition in CI workflow
    const workflow = readFileSync(ciPolicyContext.workflowFile, 'utf8');
    const splitBurnInWorkflow = readFileSync('.github/workflows/burn-in.yml', 'utf8');
    const qualityGatesJob = getJobBlock(workflow, 'quality-gates');

    // When checking quality-gates conditional execution criteria
    const hasAlwaysGateCondition =
      /if:\s*\|?\s*\n\s*always\(\)\s*&&\s*\(\s*\(?\s*needs\.test\.result\s*==\s*'success'/.test(qualityGatesJob);
    const hasInlineBurnInCondition = /needs\['burn-in'\]\.result/.test(qualityGatesJob);
    const splitBurnInWorkflowRunTrigger =
      /workflow_run:\s*\n\s*workflows:\s*\['RouteShyft CI'\]\s*\n\s*types:\s*\[completed\]/.test(splitBurnInWorkflow);
    const splitBurnInRequiresCiSuccess = /run\.conclusion !== 'success'/.test(splitBurnInWorkflow);
    const splitBurnInCondition =
      splitBurnInWorkflowRunTrigger &&
      splitBurnInRequiresCiSuccess &&
      !hasInlineBurnInCondition;

    // Then quality gates should only execute after required successful upstream quality stages
    expect(hasAlwaysGateCondition && (hasInlineBurnInCondition || splitBurnInCondition)).toBe(true);
  });

  test('[P1] report stage always publishes policy and downstream status lines in CI summary @P1', async ({
    ciPolicyContext,
  }) => {
    // Given the workflow summary/report stages
    const workflow = readFileSync(ciPolicyContext.workflowFile, 'utf8');

    // When searching for policy-first summary output lines
    const reportContainsPolicyStatus = /echo "- policy: \$\{\{ needs\.policy\.result \}\}"/.test(workflow);
    const reportContainsLintStatus = /echo "- lint: \$\{\{ needs\.lint\.result \}\}"/.test(workflow);
    const reportContainsTestStatus = /echo "- test: \$\{\{ needs\.test\.result \}\}"/.test(workflow);
    const reportContainsQualityGateStatus = /echo "- quality-gates: \$\{\{ needs\['quality-gates'\]\.result \}\}"/.test(workflow);

    // Then summary should include policy and all quality-stage statuses
    expect(reportContainsPolicyStatus && reportContainsLintStatus && reportContainsTestStatus && reportContainsQualityGateStatus).toBe(
      true,
    );
  });

  test('[P1] local policy gate failure experience includes branch-specific recovery guidance @P1', async ({
    ciPolicyContext,
  }) => {
    // Given local execution in an isolated repository on a protected default branch
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: 'main',
      event: 'local',
      headRef: 'codex/story-0-9-routeshyft-ignored-in-local-mode',
      commitSubject: '0-9: local policy failure path',
    });

    // When validating local diagnostics quality
    const hasViolationHeadline = /Policy check failed:/.test(output);
    const hasBranchName = /Current branch:\s*main/.test(output);
    const hasRecoveryCommand = /npm run start:story-branch -- <story-id> <story-slug>/.test(output);

    // Then local feedback should be actionable and include current branch context
    expect(status !== 0 && hasViolationHeadline && hasBranchName && hasRecoveryCommand).toBe(true);
  });

  test('[P1] epic-0 quality gate script resolves jsonwebtoken with portable module lookup order @P1', async () => {
    // Given the Epic-0 quality gate script source
    const script = readFileSync('scripts/quality-gates-epic0.sh', 'utf8');

    // When checking JWT dependency resolution strategy
    const hasNodeModuleRequire = /return require\('jsonwebtoken'\);/.test(script);
    const hasBackendFallbackRequire = /return require\(path\.join\(root, 'src\/node_modules\/jsonwebtoken'\)\);/.test(
      script,
    );

    // Then script should try normal resolution first and support backend-local fallback
    expect(hasNodeModuleRequire && hasBackendFallbackRequire).toBe(true);
  });
});
