import { test, expect } from '../../support/fixtures/ciPolicyContext.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';

const STORY_BRANCH = 'codex/story-8-3-moneyshyft-explicit-lane-boundary-rules';

const SPRINT_STATUS_BASELINE = `project_lane: moneyshyft
development_status:
  0-10-kernel-readiness-verification-suite: done
  8-3-explicit-lane-boundary-rules: in-progress
course_correction:
  cc-2026-02-18:
    status: approved
`;

const ESLINT_BOUNDARY_BASELINE = `module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.ts', '*.js'],
      rules: {
        '@nx/enforce-module-boundaries': [
          'error',
          {
            depConstraints: [
              { sourceTag: 'lane:moneyshyft', onlyDependOnLibsWithTags: ['lane:moneyshyft', 'scope:shared'] },
              { sourceTag: 'lane:connectshyft', onlyDependOnLibsWithTags: ['lane:connectshyft', 'scope:shared'] },
              { sourceTag: 'lane:signshyft', onlyDependOnLibsWithTags: ['lane:signshyft', 'scope:shared'] },
              { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] }
            ]
          }
        ]
      }
    }
  ]
};
`;

const MONEYSHYFT_API_PROJECT = JSON.stringify(
  {
    name: 'moneyshyft-api',
    projectType: 'application',
    sourceRoot: 'apps/moneyshyft-api/src',
    tags: ['lane:moneyshyft', 'type:app', 'runtime:node'],
  },
  null,
  2,
);

test.describe('Story 8.3 atdd - explicit lane boundary rules API coverage', () => {
  test('[P0] policy gate blocks shared deep-imports with actionable remediation @P0', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: block shared deep imports',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': MONEYSHYFT_API_PROJECT,
        'apps/moneyshyft-api/src/deep-import-violation.ts': "import { unsafe } from '../../../packages/shared-utils/src/internal';\n",
      },
    });

    const hasBoundaryFailure = /Workspace boundary guard failed:/.test(output);
    const hasDeepImportDiagnostic = /deep\/shared boundary import/.test(output);
    const hasRemediation = /Remediation:/.test(output);

    expect(status !== 0 && hasBoundaryFailure && hasDeepImportDiagnostic && hasRemediation).toBe(true);
  });

  test('[P0] policy gate blocks shared src-root deep imports @P0', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: block shared src root deep imports',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': MONEYSHYFT_API_PROJECT,
        'apps/moneyshyft-api/src/deep-import-src-root-violation.ts': "import shared from '../../../packages/shared-utils/src';\n",
      },
    });

    const hasBoundaryFailure = /Workspace boundary guard failed:/.test(output);
    const hasDeepImportDiagnostic = /deep\/shared boundary import/.test(output);

    expect(status !== 0 && hasBoundaryFailure && hasDeepImportDiagnostic).toBe(true);
  });

  test('[P0] policy gate blocks legacy lane tags in workspace project descriptors @P0', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: reject legacy lane tags',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': JSON.stringify(
          {
            name: 'moneyshyft-api',
            projectType: 'application',
            sourceRoot: 'apps/moneyshyft-api/src',
            tags: ['lane:routeshyft', 'type:app', 'runtime:node'],
          },
          null,
          2,
        ),
      },
    });

    const hasBoundaryFailure = /Workspace boundary guard failed:/.test(output);
    const hasLegacyTagDiagnostic = /legacy lane tag 'lane:routeshyft'/.test(output);

    expect(status !== 0 && hasBoundaryFailure && hasLegacyTagDiagnostic).toBe(true);
  });

  test('[P0] policy gate blocks cross-lane imports mapped by project/package roots @P0', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: block cross lane imports',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': MONEYSHYFT_API_PROJECT,
        'libs/connect-lib/project.json': JSON.stringify(
          {
            name: 'connect-lib',
            projectType: 'library',
            sourceRoot: 'libs/connect-lib/src',
            tags: ['lane:connectshyft', 'type:lib'],
          },
          null,
          2,
        ),
        'libs/connect-lib/package.json': JSON.stringify(
          {
            name: '@acme/connect-lib',
          },
          null,
          2,
        ),
        'apps/moneyshyft-api/src/cross-lane-violation.ts': "import { connectLib } from '@acme/connect-lib';\n",
      },
    });

    const hasBoundaryFailure = /Workspace boundary guard failed:/.test(output);
    const hasCrossLaneDiagnostic = /cross-lane import '@acme\/connect-lib' is forbidden/.test(output);

    expect(status !== 0 && hasBoundaryFailure && hasCrossLaneDiagnostic).toBe(true);
  });

  test('[P0] policy gate rejects scope:shared on non-shared projects @P0', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: reject non shared scope shared tags',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': JSON.stringify(
          {
            name: 'moneyshyft-api',
            projectType: 'application',
            sourceRoot: 'apps/moneyshyft-api/src',
            tags: ['scope:shared', 'type:app', 'runtime:node'],
          },
          null,
          2,
        ),
      },
    });

    const hasBoundaryFailure = /Workspace boundary guard failed:/.test(output);
    const hasSharedTagScopeDiagnostic = /'scope:shared' is only allowed for projects under packages\/shared-\*/.test(output);

    expect(status !== 0 && hasBoundaryFailure && hasSharedTagScopeDiagnostic).toBe(true);
  });

  test('[P0] policy gate rejects ambiguous lane plus scope:shared tags @P0', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: reject ambiguous lane and shared tags',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': JSON.stringify(
          {
            name: 'moneyshyft-api',
            projectType: 'application',
            sourceRoot: 'apps/moneyshyft-api/src',
            tags: ['lane:moneyshyft', 'scope:shared', 'type:app', 'runtime:node'],
          },
          null,
          2,
        ),
      },
    });

    const hasBoundaryFailure = /Workspace boundary guard failed:/.test(output);
    const hasAmbiguousClassificationDiagnostic = /ambiguous classification/.test(output);

    expect(status !== 0 && hasBoundaryFailure && hasAmbiguousClassificationDiagnostic).toBe(true);
  });

  test('[P1] policy gate passes when lane tags and import boundaries are valid @P1', async ({ ciPolicyContext }) => {
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: STORY_BRANCH,
      event: 'pull_request',
      headRef: STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: '8-3: validate boundary baseline',
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': SPRINT_STATUS_BASELINE,
        '.eslintrc.cjs': ESLINT_BOUNDARY_BASELINE,
        'apps/moneyshyft-api/project.json': MONEYSHYFT_API_PROJECT,
        'apps/moneyshyft-api/src/boundary-baseline.ts': "import { sharedThing } from '@acme/shared-utils';\n",
      },
    });

    const hasBoundaryPass = /Workspace boundary guard passed/.test(output);
    const hasPolicyPass = /Policy check passed/.test(output);

    expect(status === 0 && hasBoundaryPass && hasPolicyPass).toBe(true);
  });
});
