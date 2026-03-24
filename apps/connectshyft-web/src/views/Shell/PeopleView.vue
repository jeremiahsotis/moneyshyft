<script setup lang="ts">
import type {
  ContactPoint,
  ContactPointStatus,
} from '@shyft/contracts';
import { computed, ref } from 'vue';
import {
  resolveConnectShyftIdentityResolutionPresentation,
  type ConnectShyftIdentityResolutionCandidate,
  type ConnectShyftIdentityResolutionResponse,
} from '@/features/connectshyft/identityResolution';
import { useSubjectContext } from '../../shell/subjectContext';

const subjectContext = useSubjectContext();
const contactPoints = ref<ContactPoint[]>([]);
const contactPointError = ref('');
const decisionResult = ref<ConnectShyftIdentityResolutionResponse | null>(null);
const decisionError = ref('');

const SAMPLE_CANDIDATES: ConnectShyftIdentityResolutionCandidate[] = [
  {
    personId: 'person_very_high',
    score: 140,
    reasons: ['Exact phone match'],
    contactPointStatus: 'reassignment_suspected',
  },
  {
    personId: 'person_medium',
    score: 60,
    reasons: ['Name similarity'],
    contactPointStatus: 'active_shared_possible',
  },
];

const isSharedStatus = (status: ContactPointStatus | null | undefined): boolean =>
  status === 'active_shared_possible' || status === 'active_shared_confirmed';

const isStaleStatus = (status: ContactPointStatus | null | undefined): boolean =>
  status === 'stale';

const isReassignmentStatus = (status: ContactPointStatus | null | undefined): boolean =>
  status === 'reassignment_suspected';

const warnMissingDecisionStatus = (payload: {
  contactPointStatus?: ContactPointStatus;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
}) => {
  if (!payload.contactPointStatus) {
    console.warn('ConnectShyft identity resolution response is missing contactPointStatus.');
  }

  (payload.candidates || []).forEach((candidate) => {
    if (!candidate.contactPointStatus) {
      console.warn('ConnectShyft identity resolution candidate is missing contactPointStatus.', {
        personId: candidate.personId,
      });
    }
  });
};

const decisionPresentation = computed(() => (
  decisionResult.value
    ? resolveConnectShyftIdentityResolutionPresentation(decisionResult.value)
    : null
));
const decisionCandidates = computed(() => decisionResult.value?.candidates || []);

async function loadContactPoints() {
  contactPointError.value = '';

  try {
    const response = await fetch('/people/contact-points');
    if (!response.ok) {
      throw new Error(`Failed to load contact points (${response.status})`);
    }

    contactPoints.value = (await response.json()) as ContactPoint[];
  } catch (error) {
    contactPointError.value = error instanceof Error ? error.message : 'Failed to load contact points';
  }
}

async function runSampleDecision() {
  decisionError.value = '';

  try {
    const response = await fetch('/people/identity/decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidates: SAMPLE_CANDIDATES,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to run identity decision (${response.status})`);
    }

    const payload = (await response.json()) as ConnectShyftIdentityResolutionResponse;
    warnMissingDecisionStatus(payload);
    decisionResult.value = payload;
  } catch (error) {
    decisionError.value = error instanceof Error ? error.message : 'Failed to run identity decision';
  }
}
</script>

<template>
  <section class="p-4 space-y-4">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold">People shell</h1>
      <p>Org unit: {{ subjectContext.orgUnitId }}</p>
      <p>PeopleCore scaffold is using direct fetch calls in this slice.</p>
    </div>

    <div class="space-y-2">
      <button
        data-test="load-contact-points"
        type="button"
        class="border border-slate-300 px-3 py-2"
        @click="loadContactPoints"
      >
        Load contact points
      </button>

      <p v-if="contactPointError">{{ contactPointError }}</p>

      <ul v-if="contactPoints.length > 0" class="list-disc pl-5 space-y-2">
        <li
          v-for="contactPoint in contactPoints"
          :key="contactPoint.id"
          class="flex flex-wrap items-center gap-2"
        >
          <span>{{ contactPoint.type }} | {{ contactPoint.normalizedValue }} | {{ contactPoint.status }}</span>
          <span
            v-if="isSharedStatus(contactPoint.status)"
            data-test="contact-point-shared-indicator"
            role="status"
            aria-label="Shared contact point indicator"
            class="border border-amber-400 px-2 py-0.5 text-xs"
          >
            Shared
          </span>
          <span
            v-if="isStaleStatus(contactPoint.status)"
            data-test="contact-point-stale-indicator"
            role="status"
            aria-label="Stale contact point indicator"
            class="border border-slate-400 px-2 py-0.5 text-xs"
          >
            Stale
          </span>
          <span
            v-if="isReassignmentStatus(contactPoint.status)"
            data-test="contact-point-reassignment-indicator"
            role="status"
            aria-label="Reassignment risk indicator"
            class="border border-rose-400 px-2 py-0.5 text-xs"
          >
            Reassignment risk
          </span>
        </li>
      </ul>
      <p v-else>No contact points loaded yet.</p>
    </div>

    <div class="space-y-2">
      <button
        data-test="run-sample-decision"
        type="button"
        class="border border-slate-300 px-3 py-2"
        @click="runSampleDecision"
      >
        Run sample identity decision
      </button>

      <p v-if="decisionError">{{ decisionError }}</p>

      <div v-if="decisionResult && decisionPresentation" data-test="decision-result" class="space-y-2">
        <p>Confidence band: {{ decisionResult.confidenceBand }}</p>
        <p>Resolution state: {{ decisionPresentation.resolvedState }}</p>
        <p>Default action: {{ decisionPresentation.defaultAction }}</p>
        <p data-test="decision-guidance">{{ decisionPresentation.guidance }}</p>
        <p v-if="decisionResult.resolverReviewId" data-test="resolver-review-id">
          Resolver review: {{ decisionResult.resolverReviewId }}
        </p>
        <ul
          v-if="decisionPresentation.showCandidates && decisionCandidates.length > 0"
          data-test="decision-candidates"
          class="list-disc pl-5"
        >
          <li
            v-for="candidate in decisionCandidates"
            :key="candidate.personId"
            class="flex flex-wrap items-center gap-2"
          >
            <span>{{ candidate.personId }} (score {{ candidate.score }})</span>
            <span data-test="decision-candidate-status">
              {{ candidate.contactPointStatus }}
            </span>
            <span
              v-if="isSharedStatus(candidate.contactPointStatus)"
              data-test="decision-candidate-shared-indicator"
              role="status"
              aria-label="Shared decision candidate indicator"
              class="border border-amber-400 px-2 py-0.5 text-xs"
            >
              Shared
            </span>
            <span
              v-if="isStaleStatus(candidate.contactPointStatus)"
              data-test="decision-candidate-stale-indicator"
              role="status"
              aria-label="Stale decision candidate indicator"
              class="border border-slate-400 px-2 py-0.5 text-xs"
            >
              Stale
            </span>
            <span
              v-if="isReassignmentStatus(candidate.contactPointStatus)"
              data-test="decision-candidate-reassignment-indicator"
              role="status"
              aria-label="Reassignment risk decision candidate indicator"
              class="border border-rose-400 px-2 py-0.5 text-xs"
            >
              Reassignment risk
            </span>
          </li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="decisionPresentation.showAttachAction"
            data-test="attach-existing"
            type="button"
            class="border border-slate-300 px-3 py-2"
          >
            Attach to suggested match
          </button>
          <button
            v-if="decisionPresentation.showCreateNewAction"
            data-test="create-new"
            type="button"
            class="border border-slate-300 px-3 py-2"
            :disabled="!decisionPresentation.createNewAllowed"
          >
            Create new person
          </button>
        </div>
        <p
          v-if="decisionPresentation.mode === 'resolver_required'"
          data-test="resolver-required-message"
        >
          Resolver review is required before creating a new person.
        </p>
      </div>
      <p v-else>No identity decision run yet.</p>
    </div>
  </section>
</template>
