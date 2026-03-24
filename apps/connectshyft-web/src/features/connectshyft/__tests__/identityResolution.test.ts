import { describe, expect, it } from 'vitest';
import {
  resolveConnectShyftIdentityResolutionPresentation,
} from '../identityResolution';

describe('resolveConnectShyftIdentityResolutionPresentation', () => {
  it('forces resolver-required friction when the API marks resolver_required', () => {
    expect(resolveConnectShyftIdentityResolutionPresentation({
      outcome: 'resolver_required',
      confidenceBand: 'medium',
      contactPointStatus: 'active_shared_possible',
      resolverReviewId: 'review-1',
      candidates: [{
        personId: 'person-1',
        score: 80,
        reasons: ['current person link'],
        contactPointStatus: 'active_shared_possible',
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

  it('treats active resolver review states as resolver-required without inferring from confidence alone', () => {
    expect(resolveConnectShyftIdentityResolutionPresentation({
      state: 'pending',
      confidenceBand: 'very_high',
      contactPointStatus: 'reassignment_suspected',
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
      contactPointStatus: 'active_shared_possible',
      candidates: [{
        personId: 'person-low',
        score: 20,
        reasons: [],
        contactPointStatus: 'active_shared_possible',
      }],
    })).toMatchObject({
      mode: 'create_new_default',
      defaultAction: 'create_new',
      showCandidates: true,
      showAttachAction: true,
      showCreateNewAction: true,
    });

    expect(resolveConnectShyftIdentityResolutionPresentation({
      confidenceBand: 'medium',
      contactPointStatus: 'stale',
      candidates: [{
        personId: 'person-medium',
        score: 60,
        reasons: [],
        contactPointStatus: 'stale',
      }],
    })).toMatchObject({
      mode: 'choice_required',
      defaultAction: 'explicit_choice',
      showAttachAction: true,
      showCreateNewAction: true,
    });

    expect(resolveConnectShyftIdentityResolutionPresentation({
      confidenceBand: 'high',
      contactPointStatus: 'active_personal',
      candidates: [{
        personId: 'person-high',
        score: 95,
        reasons: [],
        contactPointStatus: 'active_personal',
      }],
    })).toMatchObject({
      mode: 'attach_default',
      defaultAction: 'attach_existing',
      showAttachAction: true,
      showCreateNewAction: true,
      createNewAllowed: true,
    });
  });
});
