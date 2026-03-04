import { readFileSync } from 'node:fs';
import { test, expect } from '../../support/fixtures/ciPolicyContext.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';
import { getJobBlock, getNeeds } from '../../support/utils/workflowGraphParser';

const WORKFLOW_FILE = '.github/workflows/test.yml';
const BURN_IN_WORKFLOW_FILE = '.github/workflows/burn-in.yml';
const EPIC0_QUALITY_GATES_SCRIPT = 'scripts/quality-gates-epic0.sh';

let workflow = '';
let splitBurnInWorkflow = '';
let epic0QualityScript = '';

test.describe('Story 0.9 atdd - ci policy gate as blocking first stage', () => {
  test.beforeAll(async () => {
    workflow = readFileSync(WORKFLOW_FILE, 'utf8');
    splitBurnInWorkflow = readFileSync(BURN_IN_WORKFLOW_FILE, 'utf8');
    epic0QualityScript = readFileSync(EPIC0_QUALITY_GATES_SCRIPT, 'utf8');
  });

  test('[E6-ATDD-E2E-004][P0] defines required policy-first quality-stage jobs in the CI graph @P0', async () => {
    // Given the CI workflow graph definition

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
    expect(policyJob.length).toBeGreaterThan(0);
    expect(lintJob.length).toBeGreaterThan(0);
    expect(testJob.length).toBeGreaterThan(0);
    expect(burnInDefined).toBe(true);
    expect(qualityGatesJob.length).toBeGreaterThan(0);
    expect(policyRunsGate).toBe(true);
    expect(pullRequestIncludesProduction).toBe(true);
    expect(pullRequestIncludesCodexDev).toBe(true);
  });

  test('[E6-ATDD-E2E-005][P0] blocks lint, test, burn-in, and quality-gates through explicit dependency graph edges @P0', async () => {
    // Given the CI workflow graph definition

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
    expect(lintNeedsPolicy).toBe(true);
    expect(testNeedsLint).toBe(true);
    expect(inlineBurnInGraph || splitBurnInGraph).toBe(true);
  });

  test('[E6-ATDD-E2E-006][P1] quality-gates execution condition enforces successful upstream dependencies @P1', async () => {
    // Given quality gate job definition in CI workflow
    const qualityGatesJob = getJobBlock(workflow, 'quality-gates');

    // When checking quality-gates conditional execution criteria
    const hasAlwaysGateCondition = qualityGatesJob.includes('always()');
    const hasInlineTestCondition = /needs\.test\.result\s*==\s*'success'/.test(qualityGatesJob);
    const hasInlineBurnInCondition = /needs\['burn-in'\]\.result\s*==\s*'success'/.test(qualityGatesJob);
    const splitBurnInWorkflowRunTrigger =
      /workflow_run:\s*\n\s*workflows:\s*\['RouteShyft CI'\]\s*\n\s*types:\s*\[completed\]/.test(splitBurnInWorkflow);
    const splitBurnInRequiresCiSuccess = /run\.conclusion !== 'success'/.test(splitBurnInWorkflow);
    const splitBurnInCondition =
      splitBurnInWorkflowRunTrigger &&
      splitBurnInRequiresCiSuccess &&
      !hasInlineBurnInCondition;

    // Then quality gates should only execute after required successful upstream quality stages
    expect(hasAlwaysGateCondition).toBe(true);
    expect(hasInlineTestCondition).toBe(true);
    expect(hasInlineBurnInCondition || splitBurnInCondition).toBe(true);
  });

  test('[E6-ATDD-E2E-007][P1] report stage always publishes policy and downstream status lines in CI summary @P1', async () => {
    // When searching for policy-first summary output lines
    const reportContainsPolicyStatus = /echo "- policy: \$\{\{ needs\.policy\.result \}\}"/.test(workflow);
    const reportContainsLintStatus = /echo "- lint: \$\{\{ needs\.lint\.result \}\}"/.test(workflow);
    const reportContainsTestStatus = /echo "- test: \$\{\{ needs\.test\.result \}\}"/.test(workflow);
    const reportContainsQualityGateStatus = /echo "- quality-gates: \$\{\{ needs\['quality-gates'\]\.result \}\}"/.test(workflow);

    // Then summary should include policy and all quality-stage statuses
    expect(reportContainsPolicyStatus).toBe(true);
    expect(reportContainsLintStatus).toBe(true);
    expect(reportContainsTestStatus).toBe(true);
    expect(reportContainsQualityGateStatus).toBe(true);
  });

  test('[E6-ATDD-E2E-008][P1] local policy gate failure experience includes branch-specific recovery guidance @P1', async ({
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
    expect(status).not.toBe(0);
    expect(hasViolationHeadline).toBe(true);
    expect(hasBranchName).toBe(true);
    expect(hasRecoveryCommand).toBe(true);
  });

  test('[E6-ATDD-E2E-009][P1] epic-0 quality gate script resolves jsonwebtoken with portable module lookup order @P1', async () => {
    // When checking JWT dependency resolution strategy
    const hasNodeModuleRequire = /return require\('jsonwebtoken'\);/.test(epic0QualityScript);
    const hasBackendFallbackRequire = /return require\(path\.join\(root, 'src\/node_modules\/jsonwebtoken'\)\);/.test(
      epic0QualityScript,
    );

    // Then script should try normal resolution first and support backend-local fallback
    expect(hasNodeModuleRequire).toBe(true);
    expect(hasBackendFallbackRequire).toBe(true);
  });
});
