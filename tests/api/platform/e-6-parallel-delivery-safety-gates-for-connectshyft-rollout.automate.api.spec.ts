import { readFileSync } from 'node:fs';
import { test, expect } from '../../support/fixtures/connectShyftStoryE6.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';

test.describe(
  'Story e.6 Parallel Delivery Safety Gates for ConnectShyft Rollout (Automate API Expansion)',
  () => {
    test(
      '[E6-AUTOMATE-API-101][P0] approved adapter contract file remains exempt from direct-Twilio coupling scans while policy gate still passes @P0',
      async ({ storyE6Context }) => {
        const adapterContractResult = runPolicyScriptInTempRepo(
          storyE6Context.policyScript,
          storyE6Context.policyFile,
          {
            branch: storyE6Context.storyBranch,
            event: 'local',
            commitSubject: 'e-6: validate provider adapter contract exemption',
            env: {
              PROJECT_LANE: 'connectshyft',
            },
            seedFiles: {
              [storyE6Context.providerRegistryFile]: [
                "import twilio from 'twilio';",
                '',
                "export const createAdapterScopedClient = () => twilio('sid', 'token');",
                '',
              ].join('\n'),
            },
          },
        );

        const adapterContractExemptionApplied =
          /ConnectShyft provider abstraction guard passed/.test(adapterContractResult.output)
          && !/ConnectShyft provider abstraction guard failed/.test(adapterContractResult.output);

        expect(adapterContractExemptionApplied).toBe(true);
      },
    );

    test(
      '[E6-AUTOMATE-API-102][P0] policy checks deterministically block reverse route-to-connectshyft cross-module import-boundary violations including dynamic imports @P0',
      async ({ storyE6Context }) => {
        const reverseBoundaryResult = runPolicyScriptInTempRepo(
          storyE6Context.policyScript,
          storyE6Context.policyFile,
          {
            branch: storyE6Context.storyBranch,
            event: 'local',
            commitSubject: 'e-6: enforce reverse route/connectshyft import boundaries',
            env: {
              PROJECT_LANE: 'connectshyft',
            },
            seedFiles: {
              'src/src/modules/route/connectshyft-boundary-violation-e6.ts': [
                "import { resolveProviderForDispatch } from '../connectshyft/providerRegistry';",
                '',
                'export const leakingRouteBoundaryReference = resolveProviderForDispatch;',
                '',
              ].join('\n'),
              'src/src/modules/route/connectshyft-dynamic-boundary-violation-e6.ts': [
                "export const loadConnectShyftBoundary = async () => import('@modules/connectshyft/providerRegistry');",
                '',
              ].join('\n'),
            },
          },
        );

        const reverseBoundaryGuardFailed =
          reverseBoundaryResult.status !== 0
          && /connectshyft-boundary-violation-e6\.ts/.test(reverseBoundaryResult.output)
          && /connectshyft-dynamic-boundary-violation-e6\.ts/.test(reverseBoundaryResult.output)
          && /(boundary|cross-module|import-boundary)/i.test(reverseBoundaryResult.output);

        expect(reverseBoundaryGuardFailed).toBe(true);
      },
    );

    test(
      '[E6-AUTOMATE-API-103][P1] release-readiness blocker ordering remains deterministic and preserves heavy-CI-only gating for test burn-in quality stages @P1',
      async ({ storyE6Context }) => {
        const workflow = readFileSync(storyE6Context.workflowFile, 'utf8');

        const blockerOrdering = Array.from(
          workflow.matchAll(/blocked_jobs\+\=\("([^"]+)"\)/g),
        ).map((match) => match[1]);

        const hasHeavyCiGuardOnTest =
          /needs\.changes\.outputs\.run_heavy_ci\s*\}\}"\s*=\s*"true"\s*\]\s*&&\s*\[\s*"\$\{\{\s*needs\.test\.result\s*\}\}"\s*!=\s*"success"/.test(
            workflow,
          );
        const hasHeavyCiGuardOnBurnIn =
          /needs\.changes\.outputs\.run_heavy_ci\s*\}\}"\s*=\s*"true"\s*\]\s*&&\s*\[\s*"\$\{\{\s*needs\['burn-in'\]\.result\s*\}\}"\s*!=\s*"success"/.test(
            workflow,
          );
        const hasHeavyCiGuardOnQualityGates =
          /needs\.changes\.outputs\.run_heavy_ci\s*\}\}"\s*=\s*"true"\s*\]\s*&&\s*\[\s*"\$\{\{\s*needs\['quality-gates'\]\.result\s*\}\}"\s*!=\s*"success"/.test(
            workflow,
          );

        const summaryContainsReleaseBlockers =
          /echo "- release-readiness: \$\{\{ steps\.release_readiness\.outputs\.status \}\}"/.test(
            workflow,
          )
          && /echo "- release-blockers: \$\{\{ steps\.release_readiness\.outputs\.blocked_jobs \}\}"/.test(
            workflow,
          )
          && /echo "- burn-in: \$\{\{ needs\['burn-in'\]\.result \}\}"/.test(workflow)
          && /echo "- quality-gates: \$\{\{ needs\['quality-gates'\]\.result \}\}"/.test(
            workflow,
          );

        expect(blockerOrdering).toEqual([
          'policy',
          'lint',
          'test',
          'burn-in',
          'quality-gates',
        ]);
        expect(hasHeavyCiGuardOnTest).toBe(true);
        expect(hasHeavyCiGuardOnBurnIn).toBe(true);
        expect(hasHeavyCiGuardOnQualityGates).toBe(true);
        expect(summaryContainsReleaseBlockers).toBe(true);
      },
    );
  },
);
