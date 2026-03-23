import { describe, expect, it } from 'vitest';
import {
  resolveConnectShyftIdentityResolutionPresentation,
} from '../identityResolution';

describe('resolveConnectShyftIdentityResolutionPresentation', () => {
  it('forces resolver-required friction when the API marks resolver_required', () => {
    expect(resolveConnectShyftIdentityResolutionPresentation({
      outcome: 'resolver_required',
      confidenceBand: 'medium',
      resolverReviewId: 'review-1',
      candidates: [{
        personId: 'person-1',
        score: 80,
        reasons: ['current person link'],
      }],
    })).toMatchObject({
      resolvedState: 'resolver_required',
      mode: 'resolver_required',
      defaultAction: 'resolver_review',
      showCandidates: true,
      showCreateNewAction: false,
      createNewAllowed: false,
    });
  });

  it('blocks create-new when the confidence band is very_high even without an explicit resolver state', () => {
    expect(resolveConnectShyftIdentityResolutionPresentation({
      confidenceBand: 'very_high',
      candidates: [],
    })).toMatchObject({
      resolvedState: 'resolver_required',
      mode: 'resolver_required',
      showCreateNewAction: false,
      createNewAllowed: false,
    });
  });

  it('maps low, medium, and high bands to the expected friction levels', () => {
    expect(resolveConnectShyftIdentityResolutionPresentation({
      confidenceBand: 'low',
      candidates: [{ personId: 'person-low', score: 20, reasons: [] }],
    })).toMatchObject({
      mode: 'create_new_default',
      defaultAction: 'create_new',
      showCandidates: true,
      showAttachAction: true,
      showCreateNewAction: true,
    });

    expect(resolveConnectShyftIdentityResolutionPresentation({
      confidenceBand: 'medium',
      candidates: [{ personId: 'person-medium', score: 60, reasons: [] }],
    })).toMatchObject({
      mode: 'choice_required',
      defaultAction: 'explicit_choice',
      showAttachAction: true,
      showCreateNewAction: true,
    });

    expect(resolveConnectShyftIdentityResolutionPresentation({
      confidenceBand: 'high',
      candidates: [{ personId: 'person-high', score: 95, reasons: [] }],
    })).toMatchObject({
      mode: 'attach_default',
      defaultAction: 'attach_existing',
      showAttachAction: true,
      showCreateNewAction: true,
      createNewAllowed: true,
    });
  });
});
