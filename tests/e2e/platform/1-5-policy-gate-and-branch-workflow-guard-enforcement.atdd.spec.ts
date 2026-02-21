import { test, expect } from '../../support/fixtures/policyWorkflowGuardStory15.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';
import { runBranchWorkflowGuardInTempRepo } from '../../support/utils/branchWorkflowGuardTestHarness';

test.describe('Story 1.5 Policy Gate and Branch Workflow Guard Enforcement (ATDD E2E RED)', () => {
  test.skip(
    '[P1] maintainer journey: local policy and branch guard commands fail fast with actionable diagnostics on branch mismatch @P1',
    async ({ story15Context }) => {
      const policyResult = runPolicyScriptInTempRepo(story15Context.policyScript, story15Context.policyFile, {
        branch: 'main',
        event: 'local',
        headRef: story15Context.storyBranch,
        commitSubject: '1-5: local gate journey mismatch',
      });

      const branchGuardResult = runBranchWorkflowGuardInTempRepo(story15Context.branchGuardScript, {
        branch: 'main',
        workflow: '_bmad/tea/workflows/testarch/atdd/workflow.yaml',
        story: story15Context.storyFile,
      });

      const policyIncludesRecovery =
        /npm run start:story-branch -- <story-id> <story-slug>/.test(policyResult.output) &&
        /Policy reference:\s*docs\/policies\/git_policy\.md/.test(policyResult.output);
      const branchGuardIncludesPatternAndCurrent =
        /Expected branch pattern:\s*codex\/story-1-5-routeshyft-<slug>/.test(branchGuardResult.output) &&
        /Current branch:\s*main/.test(branchGuardResult.output);

      expect(
        policyResult.status !== 0 &&
          branchGuardResult.status !== 0 &&
          policyIncludesRecovery &&
          branchGuardIncludesPatternAndCurrent,
      ).toBe(true);
    },
  );

  test.skip(
    '[P1] maintainer journey: epic workflow guard accepts codex/epic-1-ops and blocks story branch reuse for epic workflows @P1',
    async ({ story15Context }) => {
      const passingEpicGuard = runBranchWorkflowGuardInTempRepo(story15Context.branchGuardScript, {
        branch: story15Context.epicBranch,
        workflow: 'retrospective',
        epic: '1',
      });

      const failingEpicGuard = runBranchWorkflowGuardInTempRepo(story15Context.branchGuardScript, {
        branch: story15Context.storyBranch,
        workflow: 'retrospective',
        epic: '1',
      });

      const hasPassMessage = /Branch guard passed for epic workflow/.test(passingEpicGuard.output);
      const hasFailMessage = /Branch guard failed/.test(failingEpicGuard.output);
      const hasExpectedEpicBranch = /Expected branch:\s*codex\/epic-1-ops/.test(failingEpicGuard.output);

      expect(
        passingEpicGuard.status === 0 &&
          hasPassMessage &&
          failingEpicGuard.status !== 0 &&
          hasFailMessage &&
          hasExpectedEpicBranch,
      ).toBe(true);
    },
  );
});
