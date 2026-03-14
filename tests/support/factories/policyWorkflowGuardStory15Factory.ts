export type PolicyWorkflowGuardStory15Context = {
  workflowFile: string;
  policyScript: string;
  branchGuardScript: string;
  policyFile: string;
  storyId: string;
  storyFile: string;
  storyBranch: string;
  epicBranch: string;
};

export function createPolicyWorkflowGuardStory15Context(
  overrides: Partial<PolicyWorkflowGuardStory15Context> = {},
): PolicyWorkflowGuardStory15Context {
  return {
    workflowFile: '.github/workflows/test.yml',
    policyScript: 'scripts/enforce-git-policy.sh',
    branchGuardScript: 'scripts/branch-ensure-workflow.sh',
    policyFile: 'docs/policies/git_policy.md',
    storyId: '1-5',
    storyFile: '_bmad-output/implementation-artifacts/1-5-policy-gate-and-branch-workflow-guard-enforcement.md',
    storyBranch: 'codex/story-1-5-moneyshyft-policy-gate-and-branch-workflow-guard-enforcement',
    epicBranch: 'codex/epic-1-ops',
    ...overrides,
  };
}
