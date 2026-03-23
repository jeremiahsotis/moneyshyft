import type { IdentityConfidenceBand } from '@shyft/contracts';

export type ConnectShyftIdentityResolutionCandidate = {
  personId: string;
  score: number;
  reasons: string[];
};

export type ConnectShyftIdentityResolutionResponse = {
  confidenceBand: IdentityConfidenceBand;
  outcome?: string | null;
  state?: string | null;
  resolverReviewId?: string | null;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
};

export type ConnectShyftIdentityResolutionMode =
  | 'create_new_silent'
  | 'create_new_default'
  | 'choice_required'
  | 'attach_default'
  | 'resolver_required';

export type ConnectShyftIdentityResolutionPresentation = {
  resolvedState: 'canonical' | 'provisional' | 'resolver_required' | 'unknown';
  mode: ConnectShyftIdentityResolutionMode;
  defaultAction: 'create_new' | 'attach_existing' | 'explicit_choice' | 'resolver_review';
  showCandidates: boolean;
  showAttachAction: boolean;
  showCreateNewAction: boolean;
  createNewAllowed: boolean;
  guidance: string;
};

const normalizeResolutionState = (
  value: unknown,
): ConnectShyftIdentityResolutionPresentation['resolvedState'] | null => {
  if (value === 'canonical' || value === 'match') {
    return 'canonical';
  }

  if (value === 'provisional' || value === 'create_new') {
    return 'provisional';
  }

  if (value === 'resolver_required' || value === 'review_needed') {
    return 'resolver_required';
  }

  return null;
};

export const resolveConnectShyftIdentityResolutionPresentation = (
  response: ConnectShyftIdentityResolutionResponse,
): ConnectShyftIdentityResolutionPresentation => {
  const resolvedState =
    normalizeResolutionState(response.state) || normalizeResolutionState(response.outcome) || 'unknown';
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  const hasCandidates = candidates.length > 0;

  if (resolvedState === 'resolver_required' || response.confidenceBand === 'very_high') {
    return {
      resolvedState: 'resolver_required',
      mode: 'resolver_required',
      defaultAction: 'resolver_review',
      showCandidates: hasCandidates,
      showAttachAction: false,
      showCreateNewAction: false,
      createNewAllowed: false,
      guidance: response.resolverReviewId
        ? 'Resolver review is required before creating a new person.'
        : 'Resolver review is required before continuing.',
    };
  }

  switch (response.confidenceBand) {
    case 'very_low':
      return {
        resolvedState,
        mode: 'create_new_silent',
        defaultAction: 'create_new',
        showCandidates: false,
        showAttachAction: false,
        showCreateNewAction: true,
        createNewAllowed: true,
        guidance: 'No strong identity match was found. Create a new person silently.',
      };
    case 'low':
      return {
        resolvedState,
        mode: 'create_new_default',
        defaultAction: 'create_new',
        showCandidates: hasCandidates,
        showAttachAction: hasCandidates,
        showCreateNewAction: true,
        createNewAllowed: true,
        guidance: hasCandidates
          ? 'Suggested matches are available, but creating a new person stays the default.'
          : 'Creating a new person stays the default.',
      };
    case 'medium':
      return {
        resolvedState,
        mode: 'choice_required',
        defaultAction: 'explicit_choice',
        showCandidates: hasCandidates,
        showAttachAction: hasCandidates,
        showCreateNewAction: true,
        createNewAllowed: true,
        guidance: 'Choose whether to attach to a suggested match or create a new person.',
      };
    case 'high':
      return {
        resolvedState,
        mode: 'attach_default',
        defaultAction: 'attach_existing',
        showCandidates: hasCandidates,
        showAttachAction: hasCandidates,
        showCreateNewAction: true,
        createNewAllowed: true,
        guidance: 'The existing match is the default, but you can still override and create a new person.',
      };
    default:
      return {
        resolvedState,
        mode: 'create_new_silent',
        defaultAction: 'create_new',
        showCandidates: false,
        showAttachAction: false,
        showCreateNewAction: true,
        createNewAllowed: true,
        guidance: 'No strong identity match was found. Create a new person silently.',
      };
  }
};
