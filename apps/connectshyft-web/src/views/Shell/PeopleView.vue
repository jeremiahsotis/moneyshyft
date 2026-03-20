<script setup lang="ts">
import type { ContactPoint, IdentityConfidenceBand } from '@shyft/contracts';
import { ref } from 'vue';
import { useSubjectContext } from '../../shell/subjectContext';

type IdentityDecisionType =
  | 'create_new_default'
  | 'suggest_attach'
  | 'require_confirmation'
  | 'require_override';

type IdentityDecisionResponse = {
  confidenceBand: IdentityConfidenceBand;
  decisionType: IdentityDecisionType;
  candidates: Array<{
    personId: string;
    score: number;
    reasons: string[];
  }>;
};

const subjectContext = useSubjectContext();
const contactPoints = ref<ContactPoint[]>([]);
const contactPointError = ref('');
const decisionResult = ref<IdentityDecisionResponse | null>(null);
const decisionError = ref('');

const SAMPLE_CANDIDATES: IdentityDecisionResponse['candidates'] = [
  {
    personId: 'person_very_high',
    score: 140,
    reasons: ['Exact phone match'],
  },
  {
    personId: 'person_medium',
    score: 60,
    reasons: ['Name similarity'],
  },
];

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

    decisionResult.value = (await response.json()) as IdentityDecisionResponse;
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

      <ul v-if="contactPoints.length > 0" class="list-disc pl-5">
        <li v-for="contactPoint in contactPoints" :key="contactPoint.id">
          {{ contactPoint.type }} | {{ contactPoint.normalizedValue }} | {{ contactPoint.status }}
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

      <div v-if="decisionResult" data-test="decision-result" class="space-y-1">
        <p>Confidence band: {{ decisionResult.confidenceBand }}</p>
        <p>Decision type: {{ decisionResult.decisionType }}</p>
      </div>
      <p v-else>No identity decision run yet.</p>
    </div>
  </section>
</template>
