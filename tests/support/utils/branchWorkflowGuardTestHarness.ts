import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

type BranchWorkflowGuardHarnessOptions = {
  branch: string;
  workflow: string;
  story?: string;
  epic?: string;
  sprintStatusContents?: string;
  phase0ReadinessContents?: string;
  env?: Record<string, string>;
};

type BranchWorkflowGuardHarnessResult = {
  output: string;
  status: number;
};

export function runBranchWorkflowGuardInTempRepo(
  branchGuardScriptPath: string,
  options: BranchWorkflowGuardHarnessOptions,
): BranchWorkflowGuardHarnessResult {
  const repoDir = mkdtempSync(join(tmpdir(), 'branch-workflow-guard-harness-'));
  const branchGuardAbsolutePath = resolve(branchGuardScriptPath);
  const sprintStatusPath = join(repoDir, '_bmad-output/implementation-artifacts/sprint-status.yaml');
  const phase0StatusPath = join(repoDir, '_bmad-output/implementation-artifacts/phase0-readiness.json');

  try {
    writeFileSync(join(repoDir, 'README.md'), '# branch workflow guard harness\n', 'utf8');
    mkdirSync(dirname(sprintStatusPath), { recursive: true });
    mkdirSync(dirname(phase0StatusPath), { recursive: true });

    writeFileSync(
      sprintStatusPath,
      options.sprintStatusContents ??
        `development_status:
  0-10-kernel-readiness-verification-suite: done
course_correction:
  cc-2026-02-18:
    status: approved
`,
      'utf8',
    );

    const readinessReportPath = join(repoDir, '_bmad-output/implementation-artifacts/phase0-readiness-report.json');
    const readinessReport = JSON.stringify(
      {
        gate: 'epic-0-quality',
        pass: true,
        timestamp_utc: '2026-02-18T00:00:00.000Z',
        phase0_readiness: {
          story_id: '0-10',
          all_passed: true,
          required_gates: [
            'tenancy',
            'auth',
            'csrf',
            'envelope',
            'eventOutbox',
            'timezone',
            'rbac',
            'activeTenantMembership',
            'globalEmailUniqueness',
          ],
          gate_results: {
            tenancy: 'pass',
            auth: 'pass',
            csrf: 'pass',
            envelope: 'pass',
            eventOutbox: 'pass',
            timezone: 'pass',
            rbac: 'pass',
            activeTenantMembership: 'pass',
            globalEmailUniqueness: 'pass',
          },
        },
      },
      null,
      2,
    );
    writeFileSync(readinessReportPath, readinessReport, 'utf8');
    const readinessReportHash = createHash('sha256').update(readinessReport, 'utf8').digest('hex');

    writeFileSync(
      phase0StatusPath,
      options.phase0ReadinessContents ??
        JSON.stringify(
          {
            phase0Status: 'complete',
            storyId: '0-10',
            recordedAt: '2026-02-18T00:00:00.000Z',
            readinessReportHash,
            requiredGates: [
              'tenancy',
              'auth',
              'csrf',
              'envelope',
              'eventOutbox',
              'timezone',
              'rbac',
              'activeTenantMembership',
              'globalEmailUniqueness',
            ],
            gateResults: {
              tenancy: 'pass',
              auth: 'pass',
              csrf: 'pass',
              envelope: 'pass',
              eventOutbox: 'pass',
              timezone: 'pass',
              rbac: 'pass',
              activeTenantMembership: 'pass',
              globalEmailUniqueness: 'pass',
            },
            readinessReportPath: '_bmad-output/implementation-artifacts/phase0-readiness-report.json',
          },
          null,
          2,
        ),
      'utf8',
    );

    execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'branch-workflow-guard-harness@example.com'], {
      cwd: repoDir,
      stdio: 'ignore',
    });
    execFileSync('git', ['config', 'user.name', 'Branch Workflow Guard Harness'], {
      cwd: repoDir,
      stdio: 'ignore',
    });
    execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'seed branch guard harness'], {
      cwd: repoDir,
      stdio: 'ignore',
    });

    if (options.branch !== 'main') {
      execFileSync('git', ['checkout', '-b', options.branch], { cwd: repoDir, stdio: 'ignore' });
    }

    const args = ['--workflow', options.workflow];
    if (options.story) {
      args.push('--story', options.story);
    }
    if (options.epic) {
      args.push('--epic', options.epic);
    }

    try {
      const output = execFileSync('bash', [branchGuardAbsolutePath, ...args], {
        cwd: repoDir,
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'local',
          GITHUB_HEAD_REF: '',
          GITHUB_REF_NAME: '',
          SPRINT_STATUS_FILE: sprintStatusPath,
          PHASE0_READINESS_STATUS_FILE: phase0StatusPath,
          ...(options.env ?? {}),
        },
        encoding: 'utf8',
      });

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
