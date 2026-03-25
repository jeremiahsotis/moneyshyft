<template>
  <main class="cs-page-shell">
    <section class="cs-page-shell__inner">
      <SectionHeader
        :eyebrow="showUnavailableState ? 'ConnectShyft' : 'Conversation'"
        :title="showUnavailableState ? 'ConnectShyft unavailable' : threadDisplayName"
        :description="showUnavailableState ? '' : 'Messages, voicemail, and next steps stay together while contact context stays nearby.'"
      >
        <template
          v-if="!showUnavailableState && threadDetail"
          #actions
        >
          <div class="flex flex-wrap items-center gap-2">
            <StatusBadge
              :label="threadStateLabel"
              tone="neutral"
            />
            <StatusBadge
              :label="threadDetail.urgencyLabel || 'Monitoring'"
              tone="attention"
            />
            <StatusBadge
              v-if="threadDetail.voicemailIndicator"
              :label="threadDetail.voicemailLabel || 'Voicemail'"
              tone="voicemail"
            />
          </div>
        </template>
      </SectionHeader>

      <SurfaceCard
        v-if="showUnavailableState"
        class="mt-5"
        padding="default"
        panel
        tone="soft"
      >
        <p
          class="cs-body"
          :style="bodyTextStyle"
        >
          {{ unavailableMessage }}
        </p>
      </SurfaceCard>

      <section
        v-else
        data-testid="connectshyft-thread-detail"
        class="mt-5"
      >
        <div
          data-testid="connectshyft-thread-surface"
          class="cs-stack pb-24"
          :style="bodyTextStyle"
        >
          <p
            data-testid="connectshyft-live-region-status"
            aria-live="polite"
            class="sr-only"
          >
            {{ feedbackBanner ? feedbackBanner.announcement : '' }}
          </p>

          <section
            v-if="threadSubjectImpactPresentation || showContextualActionFeedback || detailLoadError"
            data-testid="connectshyft-thread-action-feedback-contextual"
            class="space-y-3"
          >
            <section
              v-if="threadSubjectImpactPresentation"
              data-testid="connectshyft-thread-subject-impact-banner"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base text-amber-900"
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="space-y-1">
                  <p class="font-semibold text-amber-950">
                    Conversation context still resolving
                  </p>
                  <p data-testid="connectshyft-thread-subject-impact-message">
                    {{ threadSubjectImpactPresentation.message }}
                  </p>
                </div>

                <RouterLink
                  v-if="threadSubjectImpactPresentation.ctaLabel"
                  :to="peopleWorkspaceLink"
                  data-testid="connectshyft-thread-subject-impact-people-link"
                  class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-base font-semibold text-amber-900"
                >
                  {{ threadSubjectImpactPresentation.ctaLabel }}
                </RouterLink>
              </div>
            </section>

            <p
              v-if="feedbackBanner"
              data-testid="connectshyft-feedback-banner"
              :data-feedback-taxonomy="feedbackBanner.taxonomy"
              class="rounded-2xl border px-4 py-3 text-base"
              :class="feedbackBannerClass"
            >
              {{ feedbackBanner.message }}
            </p>

            <p
              v-if="directoryNoticeMessage"
              :data-testid="directoryNoticeTestId"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ directoryNoticeMessage }}
            </p>

            <p
              v-if="launcherNoticeMessage"
              :data-testid="launcherNoticeTestId"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ launcherNoticeMessage }}
            </p>

            <p
              v-if="showActionRefusalBanner"
              data-testid="connectshyft-thread-action-refusal-banner"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
            >
              {{ actionBannerMessage }}
            </p>

            <p
              v-if="policyRefusalBanner"
              data-testid="connectshyft-policy-refusal-banner"
              role="alert"
              aria-live="assertive"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
            >
              {{ policyRefusalBanner }}
            </p>

            <p
              v-if="policyErrorBanner"
              data-testid="connectshyft-policy-error-banner"
              role="alert"
              aria-live="assertive"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-900"
            >
              {{ policyErrorBanner }}
            </p>

            <p
              v-if="policySuccessBanner"
              data-testid="connectshyft-policy-success-banner"
              role="status"
              aria-live="polite"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ policySuccessBanner }}
            </p>

            <p
              v-if="policySuccessAuditReason"
              data-testid="connectshyft-preference-override-audit-chip"
              class="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-base font-medium text-emerald-900"
            >
              Approved reason: {{ policySuccessAuditReason }}
            </p>

            <p
              v-if="lifecycleToast"
              data-testid="connectshyft-thread-reopened-toast"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ lifecycleToast }}
            </p>

            <p
              v-if="hiddenTransitionWarning"
              data-testid="connectshyft-hidden-transition-warning"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-900"
            >
              Conversation details changed in the background. Refresh and try again.
            </p>

            <p
              v-if="detailLoadError"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
            >
              {{ detailLoadError }}
            </p>
          </section>

          <template v-if="threadDetail">
            <ResponsivePanelLayout variant="two-column">
              <template #main>
                <div class="cs-stack">
                  <ConnectShyftThreadHeader
                    :title="threadDisplayName"
                    :neighbor-context-label="neighborContextLabel"
                    :conference-context-label="threadConferenceLabel"
                    :claim-context-label="threadClaimLabel"
                    :state-label="threadStateLabel"
                    :owner-label="threadOwnerLabel"
                    :escalation-label="escalationChipLabel"
                    :inactivity-label="inactivityChipLabel"
                    :voicemail-indicator="threadDetail.voicemailIndicator === true"
                  />

                  <p
                    v-if="showPreferenceOverrideRequiredChip"
                    data-testid="connectshyft-preference-override-required-chip"
                    class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
                  >
                    Sending this text needs an approved reason before it can go out.
                  </p>

                  <SurfaceCard
                    padding="default"
                    panel
                    tone="soft"
                  >
                    <div class="flex flex-col gap-4 border-b border-slate-200 pb-4">
                      <div class="space-y-2">
                        <p class="cs-kicker">
                          Conversation Timeline
                        </p>
                        <h2 class="cs-heading-md">
                          Keep the conversation moving
                        </h2>
                        <p class="cs-body">
                          {{ threadConversationSummary }}
                        </p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          :label="threadConferenceLabel"
                          tone="context"
                        />
                        <StatusBadge
                          :label="threadTimestampLabel || 'Recently updated'"
                          tone="neutral"
                        />
                      </div>
                    </div>

                    <section
                      data-testid="connectshyft-thread-timeline"
                      class="mt-5 space-y-4"
                    >
                      <article
                        v-for="event in timelineEvents"
                        :key="event.eventId"
                        data-testid="connectshyft-thread-timeline-event"
                        class="space-y-2"
                      >
                        <div
                          v-if="event.conversationType === 'voicemail'"
                          data-testid="connectshyft-thread-timeline-event-voicemail"
                        >
                          <ConnectShyftVoicemailCard
                            :visible="true"
                            variant="timeline"
                            :label="resolveTimelineEventTitle(event)"
                            :summary="resolveTimelineEventBody(event)"
                            :direction="event.direction || 'inbound'"
                            :recording-url="event.recordingUrl || null"
                            :occurred-at-label="resolveTimelineMetaLabel(event)"
                            :duration-label="resolveVoicemailDurationLabel(event.durationSeconds)"
                            :transcript="event.transcriptionText || null"
                            :transcript-status-label="resolveVoicemailTranscriptStatus(event)"
                          />
                        </div>

                        <ConnectShyftMessageBubble
                          v-else
                          :title="resolveTimelineEventTitle(event)"
                          :body="resolveTimelineEventBody(event)"
                          :meta-label="resolveTimelineMetaLabel(event)"
                          :tone="resolveTimelineTone(event)"
                        />
                      </article>
                    </section>
                  </SurfaceCard>

                  <div class="space-y-3">
                    <p class="cs-kicker pl-1">
                      Reply In This Conversation
                    </p>
                    <ConnectShyftComposer
                      v-model="threadComposerBody"
                      :disabled="actionPending"
                      :submit-disabled="threadComposerBody.trim().length === 0"
                      submit-label="Send Message"
                      :autofocus="launchChannel === 'text'"
                      :focus-ring-class="focusRingClass"
                      :tap-target-style="tapTargetStyle"
                      @submit="submitThreadComposerDraft"
                    />
                  </div>

                  <SurfaceCard
                    padding="default"
                    tone="muted"
                  >
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <p class="cs-kicker">
                          Conversation Actions
                        </p>
                        <p class="cs-body">
                          Call, text, close, or add another contact without leaving this thread.
                        </p>
                      </div>

                      <ConnectShyftThreadActionBar
                        :actions="visibleActions"
                        :action-pending="actionPending"
                        :show-add-neighbor-action="!isViewerRole"
                        :focus-ring-class="focusRingClass"
                        :tap-target-style="tapTargetStyle"
                        @action="handleThreadAction"
                        @add-neighbor="toggleAddNeighborForm"
                      />
                    </div>
                  </SurfaceCard>

                  <section
                    v-if="addNeighborFormOpen && !isViewerRole"
                    data-testid="connectshyft-add-neighbor-form"
                    class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
                  >
                    <p class="text-lg font-semibold text-slate-900">
                      Add another contact number
                    </p>
                    <p class="mt-2 text-base text-slate-500">
                      Keep this follow-up together by adding the number you want tied to the same conversation.
                    </p>
                    <label class="mt-4 block text-base text-slate-700" for="connectshyft-add-neighbor-phone">
                      Phone number
                    </label>
                    <input
                      id="connectshyft-add-neighbor-phone"
                      v-model="addNeighborPhone"
                      data-testid="connectshyft-add-neighbor-phone"
                      type="text"
                      autocomplete="off"
                      placeholder="+1 (555) 555-0100"
                      :class="[
                        'mt-2 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="addNeighborSubmitting || actionPending"
                    >
                    <div class="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        data-testid="connectshyft-add-neighbor-submit-action"
                        :class="[
                          'min-h-[44px] rounded-full bg-emerald-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                          focusRingClass,
                        ]"
                        :style="tapTargetStyle"
                        :disabled="addNeighborSubmitting || actionPending"
                        @click="submitAddNeighbor"
                      >
                        {{ addNeighborSubmitting ? 'Adding...' : 'Add Number' }}
                      </button>
                      <button
                        type="button"
                        :class="[
                          'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                          focusRingClass,
                        ]"
                        :style="tapTargetStyle"
                        :disabled="addNeighborSubmitting || actionPending"
                        @click="closeAddNeighborForm"
                      >
                        Cancel
                      </button>
                    </div>
                  </section>

                  <section
                    v-if="preferenceOverrideModalOpen"
                    ref="preferenceOverrideModalRef"
                    data-testid="connectshyft-preference-override-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="connectshyft-preference-override-title"
                    class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
                    @keydown="handlePreferenceOverrideModalKeydown"
                  >
                    <h2
                      id="connectshyft-preference-override-title"
                      class="text-lg font-semibold text-slate-900"
                    >
                      Sending this text needs an approved reason.
                    </h2>
                    <label
                      class="mt-4 block text-base text-slate-700"
                      for="connectshyft-preference-override-reason-select"
                    >
                      Approved reason
                    </label>
                    <select
                      id="connectshyft-preference-override-reason-select"
                      v-model="preferenceOverrideReason"
                      data-testid="connectshyft-preference-override-reason-select"
                      aria-label="Override reason"
                      :class="[
                        'mt-2 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="actionPending"
                    >
                      <option value="">Select approved reason</option>
                      <option
                        v-for="reason in preferenceOverrideReasonOptions"
                        :key="reason"
                        :value="reason"
                      >
                        {{ formatOverrideReason(reason) }}
                      </option>
                    </select>

                    <label
                      class="mt-4 block text-base text-slate-700"
                      for="connectshyft-preference-override-note-input"
                    >
                      Note (optional)
                    </label>
                    <textarea
                      id="connectshyft-preference-override-note-input"
                      v-model="preferenceOverrideNote"
                      data-testid="connectshyft-preference-override-note-input"
                      rows="3"
                      :class="[
                        'mt-2 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="actionPending"
                    />

                    <p
                      v-if="preferenceOverrideError"
                      data-testid="connectshyft-preference-override-error"
                      role="alert"
                      aria-live="assertive"
                      class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
                    >
                      {{ preferenceOverrideError }}
                    </p>

                    <div class="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        data-testid="connectshyft-preference-override-submit"
                        :class="[
                          'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                          focusRingClass,
                        ]"
                        :style="tapTargetStyle"
                        :disabled="preferenceOverrideSubmitDisabled"
                        @click="submitPreferenceOverride"
                      >
                        {{ actionPending ? 'Sending...' : 'Send with reason' }}
                      </button>
                      <button
                        type="button"
                        :class="[
                          'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                          focusRingClass,
                        ]"
                        :style="tapTargetStyle"
                        :disabled="actionPending"
                        @click="closePreferenceOverrideModal"
                      >
                        Cancel
                      </button>
                    </div>
                  </section>

                  <section
                    v-if="closeModalOpen"
                    ref="closeModalRef"
                    data-testid="connectshyft-close-thread-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="connectshyft-close-thread-title"
                    class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
                    @keydown="handleCloseModalKeydown"
                  >
                    <h2
                      id="connectshyft-close-thread-title"
                      class="text-lg font-semibold text-slate-900"
                    >
                      Close this conversation?
                    </h2>
                    <p class="mt-2 text-base text-slate-500">
                      You can still reopen it later if a new call or message comes in.
                    </p>
                    <div class="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        :class="[
                          'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                          focusRingClass,
                        ]"
                        :style="tapTargetStyle"
                        :disabled="actionPending"
                        @click="confirmCloseThread"
                      >
                        Confirm Close
                      </button>
                      <button
                        type="button"
                        :class="[
                          'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                          focusRingClass,
                        ]"
                        :style="tapTargetStyle"
                        :disabled="actionPending"
                        @click="closeModalOpen = false"
                      >
                        Cancel
                      </button>
                    </div>
                  </section>
                </div>
              </template>

              <template #rail>
                <div class="space-y-5 md:sticky md:top-6">
                  <SurfaceCard
                    test-id="connectshyft-thread-subject-snapshot"
                    padding="default"
                    panel
                    tone="soft"
                  >
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <p class="cs-kicker">
                          Subject Snapshot
                        </p>
                        <StatusBadge
                          :label="threadIdentityStateLabel"
                          :tone="threadIdentityStateTone"
                        />
                      </div>

                      <div class="space-y-2">
                        <p class="cs-meta">
                          {{ neighborContextLabel }}
                        </p>
                        <p
                          data-testid="connectshyft-thread-identity-state"
                          class="cs-body font-semibold text-stone-900"
                        >
                          {{ threadIdentityStateLabel }}
                        </p>
                        <p
                          data-testid="connectshyft-thread-subject-snapshot-note"
                          class="cs-meta"
                        >
                          {{ threadSubjectSnapshotNote }}
                        </p>
                      </div>
                    </div>
                  </SurfaceCard>

                  <ConnectShyftNeighborSnapshot
                    :neighbor="threadNeighbor"
                    :title="threadDisplayName"
                    :subtitle="threadConferenceLabel"
                    :note="threadSnapshotNote"
                  />

                  <SurfaceCard
                    padding="default"
                    panel
                    tone="muted"
                  >
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <p class="cs-kicker">
                          Conversation Details
                        </p>
                        <p class="cs-body">
                          {{ threadPreviewText }}
                        </p>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <StatusBadge
                          v-if="threadOwnerLabel"
                          :label="threadOwnerLabel"
                          tone="ownership"
                        />
                        <StatusBadge
                          :label="escalationChipLabel"
                          tone="attention"
                        />
                        <StatusBadge
                          :label="inactivityChipLabel"
                          tone="context"
                        />
                      </div>

                      <div class="space-y-3">
                        <div>
                          <p class="cs-kicker">
                            Last Heard
                          </p>
                          <p class="mt-2 cs-body">
                            {{ threadTimestampLabel || 'Recently updated' }}
                          </p>
                        </div>
                        <div>
                          <p class="cs-kicker">
                            Conversation Line
                          </p>
                          <p class="mt-2 cs-body">
                            {{ threadConferenceLabel }}
                          </p>
                        </div>
                        <p class="cs-meta">
                          {{ threadClaimLabel }}
                        </p>
                      </div>
                    </div>
                  </SurfaceCard>
                </div>
              </template>
            </ResponsivePanelLayout>
          </template>

          <SurfaceCard
            v-else-if="!detailLoadError"
            padding="default"
            tone="soft"
          >
            <p class="cs-body">
              Loading thread detail...
            </p>
          </SurfaceCard>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { SubjectContext } from '@shyft/contracts';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftNeighborSnapshot from '@/components/connectshyft/ConnectShyftNeighborSnapshot.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftThreadHeader from '@/components/connectshyft/ConnectShyftThreadHeader.vue';
import ConnectShyftVoicemailCard from '@/components/connectshyft/ConnectShyftVoicemailCard.vue';
import ResponsivePanelLayout from '@/components/ui/ResponsivePanelLayout.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';
import api from '@/services/api';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
  buildConnectShyftTestOverrideHeaders,
  resolveConnectShyftDeterministicTestPhone,
} from '@/features/connectshyft/flags';
import {
  createConnectShyftNeighbor,
  fetchConnectShyftNeighborsCollection,
  type ConnectShyftNeighbor,
} from '@/features/connectshyft/neighbors';
import {
  formatConnectShyftTimestamp,
  resolveConnectShyftClaimLabel,
  resolveConnectShyftConferenceLabel,
  resolveConnectShyftNeighborName,
  resolveConnectShyftPreviewText,
} from '@/features/connectshyft/presentation';
import {
  fetchConnectShyftThreadDetail,
  type ConnectShyftThreadDetail,
  type ConnectShyftTimelineEvent,
} from '@/features/connectshyft/readContracts';
import { resolveConnectShyftThreadSubjectImpactPresentation } from '@/features/connectshyft/identityResolution';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_DEFAULT_SMS_OVERRIDE_REASONS,
  CONNECTSHYFT_FOCUS_RING_CLASS,
  createConnectShyftFeedback,
  resolveSafeVisibleThreadActions,
  sanitizeConnectShyftOperatorCopy,
  type ConnectShyftFeedback,
  type ConnectShyftFeedbackTaxonomy,
} from '@/features/connectshyft/uiContracts';
import { SHELL_ROUTE_PATHS } from '@/shell/routes';
import {
  replaceSubjectContext,
  useSubjectContext,
} from '@/shell/subjectContext';

const route = useRoute();
const subjectContext = useSubjectContext();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const threadDetail = ref<ConnectShyftThreadDetail | null>(null);
const threadNeighbors = ref<ConnectShyftNeighbor[]>([]);
const detailLoadError = ref('');
const lifecycleToast = ref('');
const actionError = ref('');
const hiddenTransitionWarning = ref(false);
const actionPending = ref(false);
const closeModalOpen = ref(false);
const inactivityReset = ref(false);
const feedbackBanner = ref<ConnectShyftFeedback | null>(null);
const policyRefusalBanner = ref('');
const policyErrorBanner = ref('');
const policySuccessBanner = ref('');
const policySuccessAuditReason = ref('');
const preferenceOverrideModalOpen = ref(false);
const preferenceOverrideReason = ref('');
const preferenceOverrideNote = ref('');
const preferenceOverrideError = ref('');
const preferenceOverrideAllowedReasons = ref<string[]>([]);
const pendingPreferenceOverrideAction = ref<'Text' | 'Send Message' | null>(null);
const addNeighborFormOpen = ref(false);
const addNeighborPhone = ref('');
const addNeighborSubmitting = ref(false);
const threadComposerBody = ref('');
const preferenceOverrideModalRef = ref<HTMLElement | null>(null);
const closeModalRef = ref<HTMLElement | null>(null);
const focusRingClass = CONNECTSHYFT_FOCUS_RING_CLASS;
const bodyTextStyle = {
  fontSize: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minBodyTextPx}px`,
};
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const CONNECTSHYFT_OVERRIDE_REFUSAL_CODES = new Set([
  'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
  'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
  'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_REQUIRED',
]);
const THREAD_SUBJECT_IMPACT_REFRESH_INTERVAL_MS = 15000;
const CONNECTSHYFT_MODAL_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const resolveStateLabel = (state: ConnectShyftThreadDetail['state']): string => {
  if (state === 'CLAIMED') {
    return 'Assigned';
  }

  if (state === 'CLOSED') {
    return 'Closed';
  }

  return 'Available';
};

const resolveClaimContextLabelFromState = (state: ConnectShyftThreadDetail['state']): string => {
  if (state === 'CLAIMED') {
    return 'Assigned to a volunteer';
  }

  if (state === 'CLOSED') {
    return 'Conversation closed';
  }

  return 'Available to pick up';
};

const role = computed(() => {
  const rawRole = typeof route.query.tenantRole === 'string'
    ? route.query.tenantRole
    : typeof route.query.role === 'string'
      ? route.query.role
      : '';
  return rawRole.trim().toUpperCase();
});

const actorUserId = computed(() => {
  const rawActorUserId = typeof route.query.actorUserId === 'string'
    ? route.query.actorUserId
    : typeof route.query.userId === 'string'
      ? route.query.userId
      : '';
  return rawActorUserId.trim() || null;
});

const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');
const isTenantAdminResolver = computed(() =>
  role.value === 'TENANT_ADMIN' || role.value === 'ADMIN');

const threadId = computed(() => {
  const rawValue = route.params.threadId;
  return typeof rawValue === 'string' ? rawValue.trim() : '';
});

const activeOrgUnitId = computed<string>(() => {
  const threadOrgUnitId = threadDetail.value?.orgUnitId?.trim();
  if (threadOrgUnitId) {
    return threadOrgUnitId;
  }

  const queryOrgUnitId = typeof route.query.orgUnitId === 'string'
    ? route.query.orgUnitId.trim()
    : '';
  return queryOrgUnitId || subjectContext.value.orgUnitId || '';
});

const threadSubjectContext = computed<SubjectContext | null>(() => threadDetail.value?.subjectContext || null);

const threadSubjectImpact = computed(() => threadDetail.value?.subjectImpact || null);

const threadSubjectImpactPresentation = computed(() => {
  if (!threadSubjectImpact.value) {
    return null;
  }

  return resolveConnectShyftThreadSubjectImpactPresentation({
    subjectImpact: threadSubjectImpact.value,
    isTenantAdminResolver: isTenantAdminResolver.value,
  });
});

const peopleWorkspaceLink = computed(() => ({
  path: SHELL_ROUTE_PATHS.people,
  query: {
    ...route.query,
    ...(activeOrgUnitId.value ? { orgUnitId: activeOrgUnitId.value } : {}),
  },
}));

const resolveQueryString = (...keys: string[]): string | null => {
  for (const key of keys) {
    const rawValue = route.query[key];
    if (typeof rawValue !== 'string') {
      continue;
    }

    const normalized = rawValue.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
};

const testHarnessOperatorContactPointId = computed(() =>
  resolveQueryString('operatorContactPointId', 'callbackPhone', 'operatorPhone')
  || resolveConnectShyftDeterministicTestPhone(actorUserId.value, threadId.value)
);

const testHarnessNeighborTargetPhone = computed(() =>
  resolveQueryString('targetPhone', 'neighborPhone')
  || resolveConnectShyftDeterministicTestPhone(threadId.value, actorUserId.value)
);

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return sanitizeConnectShyftOperatorCopy(
      availability.value.refusal.message,
      'ConnectShyft is unavailable right now.',
    );
  }

  if (!moduleAvailable.value) {
    return 'ConnectShyft is currently unavailable in this workspace. Ask an administrator to help restore access.';
  }

  return 'The conversation view is currently unavailable in this workspace.';
});

const setFeedbackBanner = (
  taxonomy: ConnectShyftFeedbackTaxonomy,
  rawMessage: unknown,
  fallbackMessage: string,
): void => {
  feedbackBanner.value = createConnectShyftFeedback(taxonomy, rawMessage, fallbackMessage);
};

const clearFeedbackBanner = (): void => {
  feedbackBanner.value = null;
};

const clearPolicyBanners = (): void => {
  policyRefusalBanner.value = '';
  policyErrorBanner.value = '';
  policySuccessBanner.value = '';
  policySuccessAuditReason.value = '';
};

const resetPreferenceOverrideState = (): void => {
  preferenceOverrideReason.value = '';
  preferenceOverrideNote.value = '';
  preferenceOverrideError.value = '';
  preferenceOverrideAllowedReasons.value = [];
};

const closePreferenceOverrideModal = (): void => {
  preferenceOverrideModalOpen.value = false;
  pendingPreferenceOverrideAction.value = null;
  resetPreferenceOverrideState();
};

const resolveModalFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(CONNECTSHYFT_MODAL_FOCUSABLE_SELECTOR),
  );
};

const focusFirstModalElement = async (container: HTMLElement | null): Promise<void> => {
  await nextTick();
  const focusable = resolveModalFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return;
  }

  container?.focus();
};

const trapModalFocus = (event: KeyboardEvent, container: HTMLElement | null): void => {
  if (event.key !== 'Tab') {
    return;
  }

  const focusable = resolveModalFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (!active || !container?.contains(active)) {
    event.preventDefault();
    first.focus();
    return;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const submitThreadComposerDraft = (): void => {
  const body = threadComposerBody.value.trim();
  if (body.length === 0) {
    return;
  }

  void executeThreadAction('Send Message', { body });
};

const handlePreferenceOverrideModalKeydown = (event: KeyboardEvent): void => {
  trapModalFocus(event, preferenceOverrideModalRef.value);
};

const handleCloseModalKeydown = (event: KeyboardEvent): void => {
  trapModalFocus(event, closeModalRef.value);
};

const formatOverrideReason = (reason: string): string => {
  return reason
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (token) => token.toUpperCase());
};

const showPreferenceOverrideRequiredChip = computed(() => {
  return preferenceOverrideModalOpen.value
    || pendingPreferenceOverrideAction.value !== null
    || preferenceOverrideError.value.length > 0;
});

const preferenceOverrideReasonOptions = computed<string[]>(() => {
  if (preferenceOverrideAllowedReasons.value.length > 0) {
    return [...preferenceOverrideAllowedReasons.value];
  }

  return [...CONNECTSHYFT_DEFAULT_SMS_OVERRIDE_REASONS];
});

const preferenceOverrideSubmitDisabled = computed(() => {
  return actionPending.value || preferenceOverrideReason.value.trim().length === 0;
});

const inactivityChipLabel = computed(() => {
  return inactivityReset.value ? 'Inactivity reset' : 'Inactivity stable';
});

const escalationChipLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Monitoring';
  }
  const label = threadDetail.value.urgencyLabel.trim();
  return label || 'Monitoring';
});

const visibleActions = computed<string[]>(() => {
  if (isViewerRole.value) {
    return [];
  }

  if (!threadDetail.value) {
    return [];
  }

  return resolveSafeVisibleThreadActions({
    state: threadDetail.value.state,
    rawActions: threadDetail.value.actions,
  });
});

const showActionRefusalBanner = computed(() => {
  return isViewerRole.value || actionError.value.length > 0;
});

const actionBannerMessage = computed(() => {
  if (isViewerRole.value) {
    return 'Conversation actions are unavailable for your access level.';
  }

  return actionError.value;
});

const feedbackBannerClass = computed(() => {
  if (!feedbackBanner.value) {
    return 'border-slate-300 bg-slate-50 text-slate-900';
  }

  if (feedbackBanner.value.taxonomy === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (feedbackBanner.value.taxonomy === 'refusal') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-rose-200 bg-rose-50 text-rose-900';
});

const directoryNoticeTestId = computed(() => {
  if (route.query.directoryNotice === 'existing') {
    return 'connectshyft-directory-existing-thread-notice';
  }

  if (route.query.directoryNotice === 'new') {
    return 'connectshyft-directory-new-thread-notice';
  }

  return '';
});

const directoryNoticeMessage = computed(() => {
  if (route.query.directoryNotice === 'existing') {
    return 'Opened the existing active conversation for this neighbor.';
  }

  if (route.query.directoryNotice === 'new') {
    return 'Started a new conversation for this neighbor.';
  }

  return '';
});

const launchChannel = computed<'call' | 'text' | null>(() => {
  return route.query.launchChannel === 'call' || route.query.launchChannel === 'text'
    ? route.query.launchChannel
    : null;
});

const launchState = computed<'new' | 'existing' | null>(() => {
  return route.query.launchState === 'new' || route.query.launchState === 'existing'
    ? route.query.launchState
    : null;
});

const launcherNoticeTestId = computed(() => {
  if (launchChannel.value === 'text') {
    return 'connectshyft-thread-launcher-text-notice';
  }

  if (launchChannel.value === 'call') {
    return 'connectshyft-thread-launcher-call-notice';
  }

  return '';
});

const launcherNoticeMessage = computed(() => {
  if (launchChannel.value === 'text' && launchState.value === 'new') {
    return 'Started a new conversation and opened it ready for a text reply.';
  }

  if (launchChannel.value === 'text') {
    return 'Opened this conversation with the text box ready to reply.';
  }

  if (launchChannel.value === 'call' && launchState.value === 'new') {
    return 'Started a new conversation and placed the call from it.';
  }

  if (launchChannel.value === 'call') {
    return 'Placed the call from this conversation.';
  }

  return '';
});

const showContextualActionFeedback = computed(() => {
  return feedbackBanner.value !== null
    || directoryNoticeMessage.value.length > 0
    || launcherNoticeMessage.value.length > 0
    || showActionRefusalBanner.value
    || policyRefusalBanner.value.length > 0
    || policyErrorBanner.value.length > 0
    || policySuccessBanner.value.length > 0
    || policySuccessAuditReason.value.length > 0
    || lifecycleToast.value.length > 0
    || hiddenTransitionWarning.value;
});

const neighborsById = computed(() => {
  return new Map(threadNeighbors.value.map((neighbor) => [neighbor.neighborId, neighbor]));
});

const threadNeighbor = computed<ConnectShyftNeighbor | null>(() => {
  if (!threadDetail.value?.neighborId) {
    return null;
  }

  return neighborsById.value.get(threadDetail.value.neighborId) || null;
});

const neighborContextLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Neighbor context unavailable';
  }

  return threadDetail.value.neighborContextLabel || 'Neighbor context: Active thread';
});

const threadDisplayName = computed(() => {
  if (!threadDetail.value) {
    return 'Conversation';
  }

  return resolveConnectShyftNeighborName(threadDetail.value, threadNeighbor.value);
});

const threadConferenceLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Conference follow-up queue';
  }

  return resolveConnectShyftConferenceLabel(threadDetail.value);
});

const threadClaimLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Available to pick up';
  }

  return resolveConnectShyftClaimLabel(threadDetail.value, actorUserId.value);
});

const threadStateLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Available';
  }

  return resolveStateLabel(threadDetail.value.state);
});

const threadOwnerLabel = computed(() => {
  if (!threadDetail.value || threadDetail.value.state !== 'CLAIMED') {
    return '';
  }

  if (actorUserId.value && threadDetail.value.claimedByUserId === actorUserId.value) {
    return "You're following up";
  }

  return 'Another volunteer is following up';
});

const threadPreviewText = computed(() => {
  if (!threadDetail.value) {
    return 'Conversation activity recorded.';
  }

  return resolveConnectShyftPreviewText(threadDetail.value);
});

const threadTimestampLabel = computed(() => {
  if (!threadDetail.value) {
    return '';
  }

  return formatConnectShyftTimestamp(threadDetail.value.lastActivityAtUtc);
});

const threadSnapshotNote = computed(() => {
  if (threadSubjectImpact.value) {
    return 'If identity is still being confirmed, the banner above will keep you updated until the final match is ready.';
  }

  if (threadDetail.value?.identityState === 'provisional') {
    return 'This contact match is still provisional and will update once the person is confirmed.';
  }

  if (threadDetail.value?.voicemailIndicator) {
    return 'Keep the voicemail and the next follow-up step together while you respond.';
  }

  return 'Contact context stays here so the conversation can stay centered.';
});

const threadSubjectSnapshotNote = computed(() => {
  if (!threadDetail.value?.identityState) {
    return 'The final person match will appear here once this conversation is linked.';
  }

  if (threadSubjectImpact.value?.impactType === 'resolver_required') {
    return 'This snapshot shows the current match while identity review is still in progress.';
  }

  if (threadSubjectImpact.value?.impactType === 'rebind_review') {
    return 'This snapshot updates to final truth as soon as the current review finishes.';
  }

  if (threadDetail.value.identityState === 'provisional') {
    return 'This snapshot is still provisional until subject truth is confirmed.';
  }

  return 'Resolved subject truth is currently in sync with this conversation.';
});

const threadIdentityStateLabel = computed(() => {
  if (threadDetail.value?.identityState === 'provisional') {
    return 'Provisional person';
  }

  if (threadDetail.value?.identityState === 'confirmed') {
    return 'Confirmed person';
  }

  return 'Person match pending';
});

const threadIdentityStateTone = computed<'review' | 'success' | 'neutral'>(() => {
  if (threadDetail.value?.identityState === 'provisional') {
    return 'review';
  }

  if (threadDetail.value?.identityState === 'confirmed') {
    return 'success';
  }

  return 'neutral';
});

const threadConversationSummary = computed(() => {
  if (!threadDetail.value) {
    return 'Messages and next steps stay in one readable timeline.';
  }

  if (threadDetail.value.voicemailIndicator) {
    return 'Voicemail, messages, and next steps stay together in one calm conversation view.';
  }

  return 'Messages and next steps stay together in one calm conversation view.';
});

const timelineEvents = computed<ConnectShyftTimelineEvent[]>(() => {
  if (!threadDetail.value) {
    return [];
  }

  if (threadDetail.value.timeline.length > 0) {
    return threadDetail.value.timeline;
  }

  return [
    {
      eventId: `${threadDetail.value.threadId}-summary`,
      eventName: 'connectshyft.timeline.summary',
      summary: threadDetail.value.voicemailIndicator
        ? (threadDetail.value.voicemailLabel || 'Voicemail received')
        : (threadDetail.value.preview || threadDetail.value.summary || 'Conversation activity recorded.'),
      conversationType: threadDetail.value.voicemailIndicator ? 'voicemail' : 'message',
      direction: threadDetail.value.voicemailIndicator ? 'inbound' : 'system',
      occurredAtUtc: threadDetail.value.lastActivityAtUtc,
      body: threadDetail.value.preview || threadDetail.value.summary || 'Conversation activity recorded.',
    },
  ];
});

const resolveTimelineEventTitle = (event: ConnectShyftTimelineEvent): string => {
  if (event.conversationType === 'voicemail') {
    return event.direction === 'outbound' ? 'Voicemail left' : 'Voicemail received';
  }

  if (event.direction === 'outbound') {
    return 'You sent a message';
  }

  if (event.direction === 'inbound') {
    return 'Neighbor message';
  }

  return 'Conversation update';
};

const resolveTimelineEventBody = (event: ConnectShyftTimelineEvent): string => {
  const body = event.body?.trim();
  if (body) {
    return body;
  }

  if (event.conversationType === 'voicemail') {
    return sanitizeConnectShyftOperatorCopy(
      event.summary,
      'Voicemail is ready for follow-up.',
    );
  }

  return sanitizeConnectShyftOperatorCopy(
    event.summary,
    'Conversation activity recorded.',
  );
};

const resolveTimelineMetaLabel = (event: ConnectShyftTimelineEvent): string => {
  if (event.occurredAtUtc) {
    return formatConnectShyftTimestamp(event.occurredAtUtc);
  }

  return threadTimestampLabel.value;
};

const resolveTimelineTone = (
  event: ConnectShyftTimelineEvent,
): 'inbound' | 'outbound' | 'system' => {
  if (event.direction === 'outbound') {
    return 'outbound';
  }

  if (event.direction === 'system') {
    return 'system';
  }

  return 'inbound';
};

const resolveVoicemailDurationLabel = (durationSeconds?: number | null): string => {
  if (!durationSeconds || durationSeconds < 1) {
    return '';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  if (minutes < 1) {
    return `${seconds}s long`;
  }

  if (seconds === 0) {
    return `${minutes}m long`;
  }

  return `${minutes}m ${seconds}s long`;
};

const resolveVoicemailTranscriptStatus = (event: ConnectShyftTimelineEvent): string => {
  if (event.transcriptionText?.trim()) {
    return '';
  }

  const status = (event.transcriptionStatus || '').trim().toLowerCase();
  if (status === 'pending') {
    return 'Transcript is on the way.';
  }

  if (status === 'failed') {
    return 'Transcript could not be prepared yet.';
  }

  if (event.recordingUrl) {
    return 'Transcript is not ready yet.';
  }

  return '';
};

const parseThreadActions = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

const isThreadState = (value: unknown): value is ConnectShyftThreadDetail['state'] => {
  return value === 'UNCLAIMED' || value === 'CLAIMED' || value === 'CLOSED';
};

const applyThreadUpdate = (payload: unknown): void => {
  if (!threadDetail.value || !payload || typeof payload !== 'object') {
    return;
  }

  const candidate = payload as {
    state?: unknown;
    stateLabel?: unknown;
    claimedByUserId?: unknown;
    claimed_by_user_id?: unknown;
    urgencyLabel?: unknown;
    escalation?: {
      stage?: unknown;
    };
    lastInboundCsNumberId?: unknown;
    last_inbound_cs_number_id?: unknown;
    preferredOutboundCsNumberId?: unknown;
    preferred_outbound_cs_number_id?: unknown;
    display?: {
      stateLabel?: unknown;
      claimContext?: unknown;
    };
    actions?: unknown;
  };

  const current = threadDetail.value;
  const nextStateCandidate = typeof candidate.state === 'string'
    ? candidate.state.trim().toUpperCase()
    : current.state;
  const nextState = isThreadState(nextStateCandidate)
    ? nextStateCandidate
    : current.state;

  const claimedByUserId = typeof candidate.claimedByUserId === 'string'
    ? candidate.claimedByUserId.trim()
    : typeof candidate.claimed_by_user_id === 'string'
      ? candidate.claimed_by_user_id.trim()
      : current.claimedByUserId;

  const escalationStage = typeof candidate.escalation?.stage === 'number'
    ? candidate.escalation.stage
    : current.escalationStage;
  const urgencyLabel = typeof candidate.urgencyLabel === 'string'
    ? candidate.urgencyLabel.trim()
    : current.urgencyLabel;
  const stateLabel = typeof candidate.stateLabel === 'string'
    ? candidate.stateLabel.trim()
    : typeof candidate.display?.stateLabel === 'string'
      ? candidate.display.stateLabel.trim()
      : resolveStateLabel(nextState);
  const claimContextLabel = typeof candidate.display?.claimContext === 'string'
    ? candidate.display.claimContext.trim()
    : resolveClaimContextLabelFromState(nextState);
  const nextActions = parseThreadActions(candidate.actions);
  const resolvedActions = resolveSafeVisibleThreadActions({
    state: nextState,
    rawActions: nextActions || current.actions,
  });

  threadDetail.value = {
    ...current,
    state: nextState,
    stateLabel,
    claimedByUserId: claimedByUserId || null,
    escalationStage,
    urgencyLabel,
    claimContextLabel,
    lastInboundCsNumberId: typeof candidate.lastInboundCsNumberId === 'string'
      ? candidate.lastInboundCsNumberId
      : typeof candidate.last_inbound_cs_number_id === 'string'
        ? candidate.last_inbound_cs_number_id
        : current.lastInboundCsNumberId,
    preferredOutboundCsNumberId: typeof candidate.preferredOutboundCsNumberId === 'string'
      ? candidate.preferredOutboundCsNumberId
      : typeof candidate.preferred_outbound_cs_number_id === 'string'
        ? candidate.preferred_outbound_cs_number_id
        : current.preferredOutboundCsNumberId,
    actions: resolvedActions,
    lifecycle: {
      reopenedByInbound: current.lifecycle?.reopenedByInbound === true,
    },
  };
};

const resolveOverrideAllowedReasons = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate = payload as {
    preferencePolicy?: {
      allowedOverrideReasons?: unknown;
    };
    allowedOverrideReasons?: unknown;
  };

  const fromPolicy = Array.isArray(candidate.preferencePolicy?.allowedOverrideReasons)
    ? candidate.preferencePolicy?.allowedOverrideReasons
    : Array.isArray(candidate.allowedOverrideReasons)
      ? candidate.allowedOverrideReasons
      : [];

  return fromPolicy
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

const isPreferenceOverrideRefusal = (payload: {
  code?: unknown;
  data?: unknown;
}): boolean => {
  const code = typeof payload.code === 'string' ? payload.code : '';
  if (CONNECTSHYFT_OVERRIDE_REFUSAL_CODES.has(code)) {
    return true;
  }

  if (!payload.data || typeof payload.data !== 'object') {
    return false;
  }

  const data = payload.data as {
    preferencePolicy?: {
      overrideRequired?: unknown;
    };
  };

  return data.preferencePolicy?.overrideRequired === true;
};

const openPreferenceOverrideModal = (input: {
  action: 'Text' | 'Send Message';
  message: string;
  allowedReasons: string[];
}): void => {
  if (pendingPreferenceOverrideAction.value !== input.action) {
    preferenceOverrideReason.value = '';
    preferenceOverrideNote.value = '';
  }

  pendingPreferenceOverrideAction.value = input.action;
  preferenceOverrideModalOpen.value = true;
  preferenceOverrideError.value = input.message;
  preferenceOverrideAllowedReasons.value = input.allowedReasons;
};

type ConnectShyftThreadActionEnvelopePayload = {
  ok?: boolean;
  code?: unknown;
  message?: string;
  errorType?: unknown;
  refusalType?: unknown;
  data?: {
    thread?: unknown;
    lifecycleEvent?: unknown;
    operatorFeedback?: unknown;
    operatorFeedbackMeta?: unknown;
    preferencePolicy?: {
      override?: {
        reason?: unknown;
      };
    };
    uiFeedback?: {
      severity?: unknown;
      message?: unknown;
      heading?: unknown;
      hiddenTransition?: unknown;
    };
  };
};

const handleThreadActionRefusalEnvelope = (
  action: string,
  envelope: ConnectShyftThreadActionEnvelopePayload,
): false => {
  const refusalMessage = sanitizeConnectShyftOperatorCopy(
    envelope.message,
    'Unable to complete that thread action.',
  );
  const refusalErrorType = typeof envelope.errorType === 'string'
    ? envelope.errorType.trim().toLowerCase()
    : '';

  applyThreadUpdate(envelope.data?.thread);

  const refusalLifecycleEvent = typeof envelope.data?.lifecycleEvent === 'string'
    ? envelope.data.lifecycleEvent
    : '';

  const refusalOperatorFeedbackMeta = envelope.data?.operatorFeedbackMeta
    && typeof envelope.data.operatorFeedbackMeta === 'object'
    ? envelope.data.operatorFeedbackMeta as {
      heading?: unknown;
      hiddenTransition?: unknown;
    }
    : envelope.data?.uiFeedback
      && typeof envelope.data.uiFeedback === 'object'
      ? envelope.data.uiFeedback as {
        heading?: unknown;
        hiddenTransition?: unknown;
      }
      : null;

  const refusalHiddenTransitionDetected = refusalOperatorFeedbackMeta?.hiddenTransition === true;
  hiddenTransitionWarning.value = refusalHiddenTransitionDetected;

  if (refusalLifecycleEvent.includes('thread_reopened_by_user')) {
    const reopenHeading = sanitizeConnectShyftOperatorCopy(
      refusalOperatorFeedbackMeta?.heading,
      'Conversation reopened. Escalation and inactivity timers were reset.',
    );
    lifecycleToast.value = reopenHeading;
    inactivityReset.value = true;
    if (threadDetail.value) {
      threadDetail.value.escalationStage = 0;
    }
  } else {
    lifecycleToast.value = '';
    inactivityReset.value = false;
  }

  const requiresOverride = isPreferenceOverrideRefusal({
    code: envelope.code,
    data: envelope.data,
  });

  if (requiresOverride && (action === 'Send Message' || action === 'Text')) {
    const nextStepMessage = `${refusalMessage} Add override reason and submit again.`;
    actionError.value = '';
    policyRefusalBanner.value = nextStepMessage;
    setFeedbackBanner('refusal', refusalMessage, 'Override reason required before sending SMS.');
    openPreferenceOverrideModal({
      action,
      message: refusalMessage,
      allowedReasons: resolveOverrideAllowedReasons(envelope.data),
    });
    return false;
  }

  actionError.value = refusalMessage;
  if (action === 'Send Message' || action === 'Text' || action === 'Call') {
    if (refusalErrorType === 'system') {
      policyErrorBanner.value = refusalMessage;
    } else {
      policyRefusalBanner.value = refusalMessage;
    }
  }
  setFeedbackBanner(
    'refusal',
    refusalMessage,
    'Unable to complete that thread action.',
  );
  return false;
};

const executeThreadAction = async (
  action: string,
  options: {
    overrideReason?: string | null;
    overrideNote?: string | null;
    body?: string | null;
  } = {},
): Promise<boolean> => {
  if (!threadDetail.value || !threadId.value) {
    return false;
  }

  if (isViewerRole.value) {
    actionError.value = 'Lifecycle actions are unavailable for your access level.';
    setFeedbackBanner(
      'refusal',
      actionError.value,
      'Lifecycle actions are unavailable for your access level.',
    );
    return false;
  }

  const basePath = `/connectshyft/threads/${encodeURIComponent(threadId.value)}`;
  let path = '';
  let payload: Record<string, unknown> = {
    orgUnitId: threadDetail.value.orgUnitId,
  };

  if (action === 'Claim') {
    path = `${basePath}/claim`;
  } else if (action === 'Take Over') {
    path = `${basePath}/takeover`;
    payload = {
      ...payload,
      reason: 'operator-takeover',
    };
  } else if (action === 'Close') {
    path = `${basePath}/close`;
    payload = {
      ...payload,
      resolution: 'operator-close',
    };
  } else if (action === 'Call') {
    path = `${basePath}/call`;
    payload = {
      ...payload,
      operatorContactPointId: testHarnessOperatorContactPointId.value || undefined,
      targetPhone: testHarnessNeighborTargetPhone.value || undefined,
    };
  } else if (action === 'Send Message' || action === 'Text') {
    path = `${basePath}/messages`;
    payload = {
      ...payload,
      channel: 'sms',
      body: options.body || 'Operator outbound message.',
      overrideReason: options.overrideReason || undefined,
      overrideNote: options.overrideNote || undefined,
    };
  } else {
    actionError.value = `Unsupported action: ${action}`;
    setFeedbackBanner('error', actionError.value, 'Unsupported thread action.');
    return false;
  }

  clearPolicyBanners();
  hiddenTransitionWarning.value = false;
  actionPending.value = true;
  try {
    const response = await api.post(path, payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = (response.data || {}) as ConnectShyftThreadActionEnvelopePayload;

    if (envelope.ok !== true) {
      return handleThreadActionRefusalEnvelope(action, envelope);
    }

    actionError.value = '';
    lifecycleToast.value = '';
    preferenceOverrideError.value = '';

    applyThreadUpdate(envelope.data?.thread);

    const lifecycleEvent = typeof envelope.data?.lifecycleEvent === 'string'
      ? envelope.data.lifecycleEvent
      : '';

    const operatorFeedbackMeta = envelope.data?.operatorFeedbackMeta
      && typeof envelope.data.operatorFeedbackMeta === 'object'
      ? envelope.data.operatorFeedbackMeta as {
        heading?: unknown;
        hiddenTransition?: unknown;
      }
      : envelope.data?.uiFeedback
        && typeof envelope.data.uiFeedback === 'object'
        ? envelope.data.uiFeedback as {
          heading?: unknown;
          hiddenTransition?: unknown;
        }
        : null;

    const hiddenTransitionDetected = operatorFeedbackMeta?.hiddenTransition === true;
    hiddenTransitionWarning.value = hiddenTransitionDetected;

    if (lifecycleEvent.includes('thread_reopened_by_user')) {
      const reopenHeading = sanitizeConnectShyftOperatorCopy(
        operatorFeedbackMeta?.heading,
        'Conversation reopened. Escalation and inactivity timers were reset.',
      );
      lifecycleToast.value = reopenHeading;
      inactivityReset.value = true;
      if (threadDetail.value) {
        threadDetail.value.escalationStage = 0;
      }
    } else {
      inactivityReset.value = false;
    }

    const operatorFeedback = typeof envelope.data?.operatorFeedback === 'string'
      ? envelope.data.operatorFeedback
      : '';
    const uiFeedbackMessage = sanitizeConnectShyftOperatorCopy(
      envelope.data?.uiFeedback?.message,
      operatorFeedback || envelope.message || 'Thread action completed.',
    );

    const overrideReason = typeof envelope.data?.preferencePolicy?.override?.reason === 'string'
      ? envelope.data.preferencePolicy.override.reason
      : '';
    if (overrideReason) {
      policySuccessAuditReason.value = overrideReason.toUpperCase();
      policySuccessBanner.value = 'Override applied. Outbound message dispatched.';
      preferenceOverrideModalOpen.value = false;
      pendingPreferenceOverrideAction.value = null;
      resetPreferenceOverrideState();
    } else if (action === 'Send Message' || action === 'Text' || action === 'Call') {
      policySuccessBanner.value = uiFeedbackMessage;
    }

    setFeedbackBanner(
      'success',
      uiFeedbackMessage,
      'Thread action completed.',
    );
    if (action === 'Send Message' && options.body) {
      threadComposerBody.value = '';
    }
    return true;
  } catch (error: unknown) {
    const payload = (
      error as {
        response?: {
          data?: ConnectShyftThreadActionEnvelopePayload;
        };
      }
    )?.response?.data;
    if (payload?.ok === false) {
      return handleThreadActionRefusalEnvelope(action, payload);
    }

    actionError.value = sanitizeConnectShyftOperatorCopy(
      payload?.data?.uiFeedback?.message ?? payload?.message,
      'Unable to complete that thread action.',
    );
    if (action === 'Send Message' || action === 'Text' || action === 'Call') {
      policyErrorBanner.value = actionError.value;
    }
    setFeedbackBanner('error', actionError.value, 'Unable to complete that thread action.');
    return false;
  } finally {
    actionPending.value = false;
  }
};

const submitPreferenceOverride = async (): Promise<void> => {
  const pendingAction = pendingPreferenceOverrideAction.value;
  if (!pendingAction) {
    return;
  }

  const normalizedReason = preferenceOverrideReason.value.trim();
  if (!normalizedReason) {
    preferenceOverrideError.value = 'Override reason is required before sending SMS.';
    policyRefusalBanner.value = 'Override reason required. Select a reason and submit again.';
    return;
  }

  preferenceOverrideError.value = '';
  await executeThreadAction(pendingAction, {
    overrideReason: normalizedReason,
    overrideNote: preferenceOverrideNote.value.trim() || null,
  });
};

const closeAddNeighborForm = (): void => {
  addNeighborFormOpen.value = false;
  addNeighborPhone.value = '';
};

const toggleAddNeighborForm = (): void => {
  if (addNeighborFormOpen.value) {
    closeAddNeighborForm();
    return;
  }

  addNeighborFormOpen.value = true;
};

const submitAddNeighbor = async (): Promise<void> => {
  if (!threadDetail.value || isViewerRole.value) {
    setFeedbackBanner(
      'refusal',
      'Add Neighbor is unavailable for your access level.',
      'Add Neighbor is unavailable for your access level.',
    );
    return;
  }

  const phone = addNeighborPhone.value.trim();
  if (!phone) {
    setFeedbackBanner(
      'refusal',
      'Add a phone number before creating a neighbor.',
      'Add a phone number before creating a neighbor.',
    );
    return;
  }

  addNeighborSubmitting.value = true;
  try {
    const result = await createConnectShyftNeighbor({
      firstName: 'Neighbor',
      lastName: 'Contact',
      phones: [
        {
          label: 'mobile',
          value: phone,
        },
      ],
    });

    if (!result.ok) {
      setFeedbackBanner(
        'refusal',
        result.message,
        'Unable to add neighbor right now.',
      );
      return;
    }

    setFeedbackBanner(
      'success',
      'Contact added to this workspace.',
      'Contact added.',
    );
    closeAddNeighborForm();
  } catch (_error: unknown) {
    setFeedbackBanner('error', '', 'Unable to add neighbor right now.');
  } finally {
    addNeighborSubmitting.value = false;
  }
};

const confirmCloseThread = async () => {
  closeModalOpen.value = false;
  await executeThreadAction('Close');
};

const handleThreadAction = (action: string): void => {
  if (action === 'Close') {
    closeModalOpen.value = true;
    return;
  }

  if (
    (action === 'Send Message' || action === 'Text')
    && pendingPreferenceOverrideAction.value !== null
    && !preferenceOverrideModalOpen.value
  ) {
    preferenceOverrideModalOpen.value = true;
    return;
  }

  void executeThreadAction(action);
};

const loadThreadNeighbors = async (): Promise<void> => {
  const neighborsResult = await fetchConnectShyftNeighborsCollection();
  if (!neighborsResult.ok) {
    threadNeighbors.value = [];
    return;
  }

  threadNeighbors.value = neighborsResult.neighbors;
};

let threadSubjectImpactRefreshHandle: number | null = null;

const clearThreadSubjectImpactRefresh = (): void => {
  if (threadSubjectImpactRefreshHandle === null || typeof window === 'undefined') {
    return;
  }

  window.clearInterval(threadSubjectImpactRefreshHandle);
  threadSubjectImpactRefreshHandle = null;
};

const refreshThreadDetail = async (options: {
  preserveUiState?: boolean;
  background?: boolean;
} = {}) => {
  if (options.background && actionPending.value) {
    return;
  }

  availability.value = await fetchConnectShyftAvailability();
  if (showUnavailableState.value) {
    if (options.background) {
      return;
    }

    threadDetail.value = null;
    threadNeighbors.value = [];
    detailLoadError.value = '';
    threadComposerBody.value = '';
    closeAddNeighborForm();
    closePreferenceOverrideModal();
    clearPolicyBanners();
    clearFeedbackBanner();
    return;
  }

  await loadThreadNeighbors();

  const detailResult = await fetchConnectShyftThreadDetail(threadId.value);
  if (!detailResult.ok) {
    if (options.background && threadDetail.value) {
      return;
    }

    threadDetail.value = null;
    detailLoadError.value = sanitizeConnectShyftOperatorCopy(
      detailResult.message,
      'Unable to load thread detail.',
    );
    threadComposerBody.value = '';
    setFeedbackBanner(
      'error',
      detailLoadError.value,
      'Unable to load thread detail.',
    );
    closeAddNeighborForm();
    closePreferenceOverrideModal();
    clearPolicyBanners();
    return;
  }

  threadDetail.value = {
    ...detailResult.thread,
    actions: resolveSafeVisibleThreadActions({
      state: detailResult.thread.state,
      rawActions: detailResult.thread.actions,
    }),
  };
  detailLoadError.value = '';
  if (!options.preserveUiState) {
    lifecycleToast.value = '';
    actionError.value = '';
    threadComposerBody.value = '';
    hiddenTransitionWarning.value = false;
    closeModalOpen.value = false;
    inactivityReset.value = false;
    closeAddNeighborForm();
    closePreferenceOverrideModal();
    clearPolicyBanners();
    clearFeedbackBanner();
  }
};

onMounted(() => {
  void refreshThreadDetail();
});

const handleWindowFocus = (): void => {
  if (!threadSubjectImpact.value) {
    return;
  }

  void refreshThreadDetail({
    preserveUiState: true,
    background: true,
  });
};

watch(preferenceOverrideModalOpen, (isOpen) => {
  if (!isOpen) {
    return;
  }

  void focusFirstModalElement(preferenceOverrideModalRef.value);
});

watch(closeModalOpen, (isOpen) => {
  if (!isOpen) {
    return;
  }

  void focusFirstModalElement(closeModalRef.value);
});

watch(
  threadSubjectContext,
  (nextSubjectContext) => {
    if (!nextSubjectContext) {
      return;
    }

    replaceSubjectContext(subjectContext, nextSubjectContext);
  },
  {
    immediate: true,
  },
);

watch(
  threadSubjectImpact,
  (nextImpact) => {
    clearThreadSubjectImpactRefresh();

    if (!nextImpact || typeof window === 'undefined') {
      return;
    }

    threadSubjectImpactRefreshHandle = window.setInterval(() => {
      void refreshThreadDetail({
        preserveUiState: true,
        background: true,
      });
    }, THREAD_SUBJECT_IMPACT_REFRESH_INTERVAL_MS);
  },
  {
    immediate: true,
  },
);

watch(
  () => route.fullPath,
  () => {
    void refreshThreadDetail();
  },
);

onMounted(() => {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('focus', handleWindowFocus);
});

onUnmounted(() => {
  clearThreadSubjectImpactRefresh();
  if (typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('focus', handleWindowFocus);
});
</script>
