import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test, expect } from '../../support/fixtures/ciPolicyContext.fixture';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';

type ScriptRunResult = {
  output: string;
  status: number;
};

const FEATURE_STORY_ID = '1-1';
const FEATURE_STORY_BRANCH = 'codex/story-1-1-tenant-context-resolution-and-isolation-guardrails';
const FEATURE_STORY_FILE =
  '_bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md';

function createSprintStatus(story010Status: 'done' | 'review', correctionStatus: 'approved' | 'pending'): string {
  return `development_status:
  0-10-kernel-readiness-verification-suite: ${story010Status}
course_correction:
  cc-2026-02-18:
    status: ${correctionStatus}
`;
}

function runBranchGuardInTempRepo(
  branchGuardScript: string,
  sprintStatusContents: string,
  env: Record<string, string> = {},
): ScriptRunResult {
  const repoDir = mkdtempSync(join(tmpdir(), 'branch-guard-harness-'));
  const sprintStatusPath = join(repoDir, '_bmad-output/implementation-artifacts/sprint-status.yaml');
  const branchGuardAbsolutePath = resolve(branchGuardScript);

  try {
    mkdirSync(dirname(sprintStatusPath), { recursive: true });
    writeFileSync(sprintStatusPath, sprintStatusContents, 'utf8');

    try {
      const output = execFileSync(
        'bash',
        [branchGuardAbsolutePath, '--workflow', 'dev-story', '--story', FEATURE_STORY_FILE],
        {
          cwd: repoDir,
          env: {
            ...process.env,
            GITHUB_HEAD_REF: FEATURE_STORY_BRANCH,
            SPRINT_STATUS_FILE: sprintStatusPath,
            ...env,
          },
          encoding: 'utf8',
        },
      );

      return { output, status: 0 };
    } catch (error) {
      const typed = error as { status?: number; stdout?: string; stderr?: string };
      return {
        output: `${typed.stdout ?? ''}${typed.stderr ?? ''}`,
        status: typed.status ?? 1,
      };
    }
  } finally {
    rmSync(repoDir, { recursive: true, force: true });
  }
}

test.describe('Story 0.9 atdd - ci policy gate as blocking first stage API coverage', () => {
  test('[P0] local policy checks ignore env-branch spoofing and fail on actual default branch @P0', async ({
    ciPolicyContext,
  }) => {
    // Given a repository actually on main but with spoofed non-default branch env
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: 'main',
      event: 'local',
      headRef: 'codex/story-9-9-spoofed-branch',
      commitSubject: '9-9: spoof attempt',
    });

    // Then policy should fail based on real git branch state, not env spoof values
    const hasFailurePrefix = /Policy check failed:/.test(output);
    const hasBranchFirstContext = /branch-first policy requires a non-default branch/.test(output);
    const hasCurrentBranch = /Current branch:\s*main/.test(output);
    expect(status !== 0 && hasFailurePrefix && hasBranchFirstContext && hasCurrentBranch).toBe(true);
  });

  test('[P0] rejects story pull requests targeting non-codex\\/dev base with actionable branch context @P0', async ({
    ciPolicyContext,
  }) => {
    // Given a pull request from a story branch targeting the wrong base branch
    let output = '';
    try {
      execFileSync('bash', [ciPolicyContext.policyScript], {
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'pull_request',
          GITHUB_HEAD_REF: 'codex/story-0-9-ci-policy-gate-as-blocking-first-stage',
          GITHUB_BASE_REF: 'production',
        },
        encoding: 'utf8',
      });
    } catch (error) {
      const typed = error as { stdout?: string; stderr?: string };
      output = `${typed.stdout ?? ''}${typed.stderr ?? ''}`;
    }

    // Then output should include explicit branch and base context for remediation
    const hasFailureHeadline = /Policy check failed: story pull requests must target codex\/dev/.test(output);
    const hasHeadBranchContext = /Head branch:\s*codex\/story-0-9-ci-policy-gate-as-blocking-first-stage/.test(
      output,
    );
    const hasBaseBranchContext = /Base branch:\s*production/.test(output);
    expect(hasFailureHeadline && hasHeadBranchContext && hasBaseBranchContext).toBe(true);
  });

  test('[P1] pull-request default-branch failures include policy context and remediation guidance @P1', async ({
    ciPolicyContext,
  }) => {
    // Given a pull request that runs directly from a protected default branch
    let output = '';
    try {
      execFileSync('bash', [ciPolicyContext.policyScript], {
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'pull_request',
          GITHUB_HEAD_REF: 'main',
          GITHUB_BASE_REF: 'production',
        },
        encoding: 'utf8',
      });
    } catch (error) {
      const typed = error as { stdout?: string; stderr?: string };
      output = `${typed.stdout ?? ''}${typed.stderr ?? ''}`;
    }

    // Then output should be actionable for remediation
    const hasFailureHeadline = /Policy check failed: pull requests must not run directly from main/.test(output);
    const hasPolicyReference = /Policy reference:\s*docs\/policies\/git_policy\.md/.test(output);
    const hasRemediationHint = /npm run branch:ensure-workflow -- --workflow code-review --story <story-key-or-story-file>/.test(
      output,
    );
    expect(hasFailureHeadline && hasPolicyReference && hasRemediationHint).toBe(true);
  });

  test('[P1] workflow guard blocks automate workflow when story argument is missing @P1', async ({
    ciPolicyContext,
  }) => {
    // Given automate workflow validation without required --story input
    let output = '';
    try {
      execFileSync('bash', [ciPolicyContext.branchGuardScript, '--workflow', 'automate'], {
        env: {
          ...process.env,
          GITHUB_HEAD_REF: 'codex/story-0-9-ci-policy-gate-as-blocking-first-stage',
        },
        encoding: 'utf8',
      });
    } catch (error) {
      const typed = error as { stdout?: string; stderr?: string };
      output = `${typed.stdout ?? ''}${typed.stderr ?? ''}`;
    }

    // Then output should include a clear missing-argument diagnostic
    expect(/Story workflow requires --story/.test(output)).toBe(true);
  });

  test('[P1] branch workflow guard failure output includes exact expected pattern and current branch @P1', async ({
    ciPolicyContext,
  }) => {
    // Given a mismatched story branch for workflow execution
    let output = '';
    try {
      execFileSync(
        'bash',
        [
          ciPolicyContext.branchGuardScript,
          '--workflow',
          '_bmad/tea/workflows/testarch/atdd/workflow.yaml',
          '--story',
          '_bmad-output/implementation-artifacts/0-9-ci-policy-gate-as-blocking-first-stage.md',
        ],
        {
          env: {
            ...process.env,
            GITHUB_HEAD_REF: 'codex/story-0-8-centralized-time-service-and-utc-local-rendering-contract',
          },
          encoding: 'utf8',
        },
      );
    } catch (error) {
      const typed = error as { stdout?: string; stderr?: string };
      output = `${typed.stdout ?? ''}${typed.stderr ?? ''}`;
    }

    // When reading guard failure diagnostics
    const hasExpectedPattern = /Expected branch pattern:\s*codex\/story-0-9-<slug>/.test(output);
    const hasCurrentBranch = /Current branch:\s*codex\/story-0-8-centralized-time-service-and-utc-local-rendering-contract/.test(
      output,
    );

    // Then output should include concrete branch mismatch diagnostics
    expect(hasExpectedPattern && hasCurrentBranch).toBe(true);
  });

  test('[P1] policy failure output includes explicit policy path and remediation commands for local runs @P1', async ({
    ciPolicyContext,
  }) => {
    // Given local execution on a protected default branch
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: 'codex/dev',
      event: 'local',
      headRef: 'codex/story-0-9-ignored-in-local-mode',
      commitSubject: '0-9: local default branch run',
    });

    // Then output should provide policy-document and command-level remediation hints
    const hasPolicyFileHint = /Policy reference:\s*docs\/policies\/git_policy\.md/.test(output);
    const hasRemediationCommand = /npm run start:story-branch -- <story-id> <story-slug>/.test(output);
    const hasWorkflowGuardHint = /npm run branch:ensure-workflow -- --workflow dev-story --story <story-key-or-story-file>/.test(
      output,
    );
    expect(status !== 0 && hasPolicyFileHint && hasRemediationCommand && hasWorkflowGuardHint).toBe(true);
  });

  test('[P1] story branches require matching commit subject story id @P1', async ({ ciPolicyContext }) => {
    // Given a story branch with a mismatched latest commit subject story id
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: 'codex/story-0-9-ci-policy-gate-as-blocking-first-stage',
      event: 'local',
      commitSubject: '0-8: wrong story commit subject',
    });

    // Then policy should fail with explicit branch/story mismatch context
    const hasStoryMismatchMessage = /latest commit subject must match '0-9: <summary>'/.test(output);
    const hasActualSubject = /Actual:\s*0-8: wrong story commit subject/.test(output);
    expect(status !== 0 && hasStoryMismatchMessage && hasActualSubject).toBe(true);
  });

  test('[P0] policy gate blocks non-Epic-0 story branches until Story 0.10 is marked done @P0', async ({
    ciPolicyContext,
  }) => {
    // Given CI policy evaluation on a feature-story branch with corrected-kernel gate unmet
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: FEATURE_STORY_BRANCH,
      event: 'pull_request',
      headRef: FEATURE_STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: `${FEATURE_STORY_ID}: enforce corrected-kernel gate`,
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': createSprintStatus('review', 'approved'),
      },
    });

    // Then CI policy should block workflow progression with explicit corrected-kernel context
    const hasGateFailureMessage = /corrected kernel gate unmet \(Story 0-10 is not done\)/.test(output);
    expect(status !== 0 && hasGateFailureMessage).toBe(true);
  });

  test('[P0] policy gate blocks non-Epic-0 story branches until course-correction status is approved @P0', async ({
    ciPolicyContext,
  }) => {
    // Given CI policy evaluation where Story 0.10 is done but course correction is not approved
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: FEATURE_STORY_BRANCH,
      event: 'pull_request',
      headRef: FEATURE_STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: `${FEATURE_STORY_ID}: enforce corrected-kernel gate`,
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': createSprintStatus('done', 'pending'),
      },
    });

    // Then CI policy should fail with course-correction-specific diagnostics
    const hasCourseCorrectionFailure = /corrected kernel gate unmet \(course correction cc-2026-02-18 is not approved\)/.test(
      output,
    );
    expect(status !== 0 && hasCourseCorrectionFailure).toBe(true);
  });

  test('[P0] policy gate allows non-Epic-0 story branches after corrected-kernel gate prerequisites are satisfied @P0', async ({
    ciPolicyContext,
  }) => {
    // Given CI policy evaluation with Story 0.10 done and course-correction approved
    const { output, status } = runPolicyScriptInTempRepo(ciPolicyContext.policyScript, ciPolicyContext.policyFile, {
      branch: FEATURE_STORY_BRANCH,
      event: 'pull_request',
      headRef: FEATURE_STORY_BRANCH,
      baseRef: 'codex/dev',
      commitSubject: `${FEATURE_STORY_ID}: corrected-kernel gate satisfied`,
      seedFiles: {
        '_bmad-output/implementation-artifacts/sprint-status.yaml': createSprintStatus('done', 'approved'),
      },
    });

    // Then CI policy should pass and allow downstream quality stages
    expect(status === 0 && /Policy check passed/.test(output)).toBe(true);
  });

  test('[P0] branch workflow guard blocks non-Epic-0 story execution until Story 0.10 is done @P0', async ({
    ciPolicyContext,
  }) => {
    // Given local workflow guard invocation with corrected-kernel gate unmet
    const { output, status } = runBranchGuardInTempRepo(
      ciPolicyContext.branchGuardScript,
      createSprintStatus('review', 'approved'),
    );

    // Then workflow execution should be blocked before feature-story workflow execution proceeds
    const hasKernelGateFailure = /Kernel gate failed: Story 0-10 is not done/.test(output);
    expect(status !== 0 && hasKernelGateFailure).toBe(true);
  });

  test('[P0] branch workflow guard blocks non-Epic-0 story execution until course-correction is approved @P0', async ({
    ciPolicyContext,
  }) => {
    // Given local workflow guard invocation where Story 0.10 is done but correction status is not approved
    const { output, status } = runBranchGuardInTempRepo(
      ciPolicyContext.branchGuardScript,
      createSprintStatus('done', 'pending'),
    );

    // Then workflow execution should be blocked with course-correction diagnostics
    const hasCorrectionFailure = /Kernel gate failed: course correction cc-2026-02-18 is not approved/.test(output);
    expect(status !== 0 && hasCorrectionFailure).toBe(true);
  });

  test('[P1] branch workflow guard advances past corrected-kernel gate checks when prerequisites are satisfied @P1', async ({
    ciPolicyContext,
  }) => {
    // Given local workflow guard invocation where corrected-kernel gate is satisfied
    const { output, status } = runBranchGuardInTempRepo(
      ciPolicyContext.branchGuardScript,
      createSprintStatus('done', 'approved'),
    );

    // Then corrected-kernel checks should pass and next guard should fail on missing Phase-0 readiness evidence
    const reachedPhase0Guard = /Phase-0 readiness incomplete/.test(output);
    const stillBlockedByKernelGate = /Kernel gate failed/.test(output);
    expect(status !== 0 && reachedPhase0Guard && !stillBlockedByKernelGate).toBe(true);
  });
});
