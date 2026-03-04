export type StoryE6Context = {
  storyId: 'e-6';
  storyFile: string;
  storyBranch: string;
  workflowFile: string;
  burnInWorkflowFile: string;
  policyScript: string;
  branchGuardScript: string;
  policyFile: string;
  providerRegistryFile: string;
  providerRegistryTestFile: string;
  deploymentChecklistFile: string;
  productionGuideFile: string;
};

export function createStoryE6Context(
  overrides: Partial<StoryE6Context> = {},
): StoryE6Context {
  return {
    storyId: 'e-6',
    storyFile:
      '_bmad-output/implementation-artifacts/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.md',
    storyBranch:
      'codex/story-e-6-connectshyft-parallel-delivery-safety-gates-for-connectshyft-rollout',
    workflowFile: '.github/workflows/test.yml',
    burnInWorkflowFile: '.github/workflows/burn-in.yml',
    policyScript: 'scripts/enforce-git-policy.sh',
    branchGuardScript: 'scripts/branch-ensure-workflow.sh',
    policyFile: 'docs/policies/git_policy.md',
    providerRegistryFile: 'src/src/modules/connectshyft/providerRegistry.ts',
    providerRegistryTestFile:
      'src/src/modules/connectshyft/__tests__/providerRegistry.test.ts',
    deploymentChecklistFile: 'DEPLOYMENT_CHECKLIST.md',
    productionGuideFile: 'PRODUCTION_DEPLOYMENT_GUIDE.md',
    ...overrides,
  };
}
