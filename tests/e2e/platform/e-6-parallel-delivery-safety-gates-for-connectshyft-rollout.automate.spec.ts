import { readFileSync } from 'node:fs';
import { test, expect } from '../../support/fixtures/connectShyftStoryE6.fixture';
import { runBranchWorkflowGuardInTempRepo } from '../../support/utils/branchWorkflowGuardTestHarness';

test.describe(
  'Story e.6 Parallel Delivery Safety Gates for ConnectShyft Rollout (Automate E2E Expansion)',
  () => {
    test(
      '[E6-AUTOMATE-E2E-201][P0] maintainer journey on a matching connectshyft story branch passes story-workflow branch guard checks for automate execution @P0',
      async ({ storyE6Context }) => {
        const guardResult = runBranchWorkflowGuardInTempRepo(
          storyE6Context.branchGuardScript,
          {
            branch: storyE6Context.storyBranch,
            workflow: '_bmad/tea/workflows/testarch/automate/workflow.yaml',
            story: storyE6Context.storyFile,
            env: {
              PROJECT_LANE: 'connectshyft',
            },
          },
        );

        const happyPathPassed =
          guardResult.status === 0
          && /Branch guard passed for story workflow/.test(guardResult.output);

        expect(happyPathPassed).toBe(true);
      },
    );

    test(
      '[E6-AUTOMATE-E2E-202][P1] maintainer journey fails with actionable diagnostics when epic-ops workflow is invoked from a story branch instead of codex/epic-e-ops @P1',
      async ({ storyE6Context }) => {
        const guardResult = runBranchWorkflowGuardInTempRepo(
          storyE6Context.branchGuardScript,
          {
            branch: storyE6Context.storyBranch,
            workflow: 'sprint-planning',
            epic: 'e',
          },
        );

        const hasEpicBranchDiagnostics =
          guardResult.status !== 0
          && /Workflow key:\s*sprint-planning/.test(guardResult.output)
          && /Expected branch:\s*codex\/epic-e-ops/.test(guardResult.output)
          && new RegExp(`Current branch:\\s*${storyE6Context.storyBranch}`).test(
            guardResult.output,
          )
          && /Branch guard failed/.test(guardResult.output);

        expect(hasEpicBranchDiagnostics).toBe(true);
      },
    );

    test(
      '[E6-AUTOMATE-E2E-203][P1] scheduled burn-in workflow keeps docs-only PR skip behavior advisory PR mode and blocking production/merge-group burn-in paths explicit @P1',
      async ({ storyE6Context }) => {
        const burnInWorkflow = readFileSync(storyE6Context.burnInWorkflowFile, 'utf8');

        const hasDocsOnlySkipFilters =
          /value\.startsWith\('docs\/'\)/.test(burnInWorkflow)
          && /value\.startsWith\('_bmad\/'\)/.test(burnInWorkflow)
          && /value\.startsWith\('_bmad-output\/'\)/.test(burnInWorkflow)
          && /value\.endsWith\('\.md'\)/.test(burnInWorkflow);

        const hasAdvisoryPrMode =
          /Advisory PR burn-in/.test(burnInWorkflow)
          && /advisory\s*=\s*true;[\s\S]*iterations\s*=\s*3;/.test(burnInWorkflow)
          && /if \[ "\$BURN_IN_ADVISORY" = "true" \] && \[ "\$exit_code" -ne 0 \]; then/.test(
            burnInWorkflow,
          );

        const hasBlockingProductionAndMergeGroupPaths =
          /run\.head_branch === 'production'[\s\S]*advisory\s*=\s*false;[\s\S]*iterations\s*=\s*10;/.test(
            burnInWorkflow,
          )
          && /run\.event === 'merge_group'[\s\S]*advisory\s*=\s*false;[\s\S]*iterations\s*=\s*10;/.test(
            burnInWorkflow,
          )
          && /BURN_IN_REQUIRE_TESTS:\s*'true'/.test(burnInWorkflow);

        expect(hasDocsOnlySkipFilters).toBe(true);
        expect(hasAdvisoryPrMode).toBe(true);
        expect(hasBlockingProductionAndMergeGroupPaths).toBe(true);
      },
    );
  },
);
