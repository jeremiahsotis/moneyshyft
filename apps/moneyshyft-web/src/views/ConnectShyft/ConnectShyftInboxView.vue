<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8">
    <section class="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 v-if="showUnavailableState" class="text-2xl font-semibold text-slate-900">
          ConnectShyft unavailable
        </h1>
        <h1 v-else class="text-2xl font-semibold text-slate-900">
          ConnectShyft {{ bucketTitle }}
        </h1>

        <p
          v-if="showUnavailableState"
          data-testid="connectshyft-unavailable-state"
          :style="bodyTextStyle"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section class="mb-6 rounded-md border border-slate-200 p-4">
        <h2 class="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Capability Status
        </h2>
        <dl class="grid grid-cols-1 gap-3 text-base text-slate-700 md:grid-cols-3">
          <div class="rounded border border-slate-200 p-3">
            <dt>Inbox</dt>
            <dd
              data-testid="connectshyft-capability-inbox"
              class="mt-1 font-medium"
            >
              {{ inboxAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Escalation</dt>
            <dd
              data-testid="connectshyft-capability-escalation"
              class="mt-1 font-medium"
            >
              {{ escalationAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Webhooks</dt>
            <dd
              data-testid="connectshyft-capability-webhooks"
              class="mt-1 font-medium"
            >
              {{ webhooksAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
        </dl>
      </section>

      <p
        v-if="maintenanceBanner"
        data-testid="connectshyft-capability-maintenance-banner"
        :style="bodyTextStyle"
        class="mb-6 rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-700"
      >
        {{ maintenanceBanner }}
      </p>

      <section
        v-if="inboxAvailable"
        data-testid="connectshyft-inbox-list"
        class="rounded-md border border-slate-200 p-4"
      >
        <div data-testid="connectshyft-inbox-surface" :style="bodyTextStyle">
          <h2 class="mb-3 text-base font-semibold text-slate-900">
            {{ bucketTitle }} threads
          </h2>

          <p
            v-if="threadLoadError"
            data-testid="connectshyft-inbox-load-error"
            class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
          >
            {{ threadLoadError }}
          </p>

          <p
            v-if="threadActionError"
            class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
          >
            {{ threadActionError }}
          </p>

          <p
            v-if="activeLayoutMarkerTestId"
            :data-testid="activeLayoutMarkerTestId"
            class="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
          >
            {{ activeLayoutMarkerCopy }}
          </p>

          <div class="grid gap-4" :class="layoutContainerClass">
            <section
              data-testid="connectshyft-queue-panel"
              v-if="!isMobileThreadFullscreen"
              class="space-y-4"
            >
              <label
                for="connectshyft-queue-search-input"
                class="block text-sm font-medium text-slate-700"
              >
                Search queue
              </label>
              <input
                id="connectshyft-queue-search-input"
                v-model="queueSearch"
                data-testid="connectshyft-queue-search-input"
                type="text"
                placeholder="Search summaries or context"
                autocomplete="off"
                :class="[
                  'min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
                  focusRingClass,
                ]"
                :style="tapTargetStyle"
              >

              <ul v-if="visibleThreadItems.length > 0" class="space-y-3 text-base text-slate-700">
                <li
                  v-for="item in visibleThreadItems"
                  :key="item.threadId"
                  :data-testid="`connectshyft-thread-card-${item.threadId}`"
                >
                  <ConnectShyftQueueCard
                    :thread-id="item.threadId"
                    :summary="item.display.title"
                    :preview="item.display.preview"
                    :timestamp-label="formatQueueTimestamp(item.lastActivityAtUtc)"
                    :urgency-label="item.display.urgencyLabel"
                    :context-pills="buildQueueContextPills(item)"
                    :last-inbound-context="`Inbound line: ${item.display.inboundContext}`"
                    :preferred-outbound-context="`Outbound line: ${item.display.outboundContext}`"
                    :state-label="item.display.stateLabel"
                    :voicemail-indicator="item.voicemailIndicator"
                    :voicemail-label="item.display.voicemailLabel"
                    :tap-target-aria-label="`Open thread detail for ${item.display.title || 'selected thread'}`"
                    :focus-ring-class="focusRingClass"
                    :tap-target-style="tapTargetStyle"
                    @open-thread="openThreadSurface"
                  />
                </li>
              </ul>

              <p v-else-if="!threadLoadError" class="text-base text-slate-600">
                No threads are currently available in this bucket.
              </p>

              <section
                v-if="responsiveMode !== 'desktop'"
                class="rounded border border-slate-200 bg-slate-50 p-3"
              >
                <h3 class="text-base font-semibold text-slate-900">Shared identity context</h3>
                <p class="mt-1 text-base text-slate-600">
                  Shared-phone indicators remain consistent across orgUnits in this tenant.
                </p>

                <p
                  v-if="neighborLoadError"
                  class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
                >
                  {{ neighborLoadError }}
                </p>

                <ul v-else class="mt-3 space-y-2 text-base text-slate-700">
                  <li
                    v-for="neighbor in neighbors"
                    :key="neighbor.neighborId"
                    class="rounded border border-slate-200 bg-white px-3 py-2"
                  >
                    <p class="font-medium text-slate-900">
                      {{ neighbor.firstName || 'Neighbor' }} {{ neighbor.lastName }}
                    </p>
                    <div class="mt-1 flex flex-wrap gap-2">
                      <span
                        v-for="phone in neighbor.phones"
                        :key="`${neighbor.neighborId}-${phone.phoneId}`"
                        data-testid="connectshyft-inbox-shared-phone-indicator"
                        class="rounded px-2 py-1 text-base font-medium"
                        :class="phone.isShared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ phone.label }} · {{ phone.isShared ? 'Shared' : 'Not shared' }}
                      </span>
                    </div>
                  </li>
                </ul>
              </section>

              <div data-testid="connectshyft-inbox-action-bar" class="flex flex-wrap gap-3">
                <button
                  type="button"
                  :data-testid="inboxActionCopy.openConversation.testId"
                  :aria-label="inboxActionCopy.openConversation.ariaLabel"
                  :disabled="openingConversation"
                  @click="openConversation"
                  :style="tapTargetStyle"
                  :class="[
                    'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                    focusRingClass,
                  ]"
                >
                  {{ openingConversation ? 'Opening...' : inboxActionCopy.openConversation.label }}
                </button>
                <RouterLink
                  v-if="!isViewerRole"
                  :to="buildNeighborCreatePath()"
                  :data-testid="inboxActionCopy.addNeighbor.testId"
                  :aria-label="inboxActionCopy.addNeighbor.ariaLabel"
                  :style="tapTargetStyle"
                  :class="[
                    'inline-flex min-h-[44px] items-center justify-center rounded bg-emerald-700 px-4 py-2 text-base font-medium text-white',
                    focusRingClass,
                  ]"
                >
                  {{ inboxActionCopy.addNeighbor.label }}
                </RouterLink>
                <button
                  type="button"
                  :data-testid="inboxActionCopy.composeMessage.testId"
                  :aria-label="inboxActionCopy.composeMessage.ariaLabel"
                  :disabled="isViewerRole"
                  @click="openSendMessageModal"
                  :style="tapTargetStyle"
                  :class="[
                    'min-h-[44px] rounded bg-slate-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                    focusRingClass,
                  ]"
                >
                  {{ inboxActionCopy.composeMessage.label }}
                </button>
                <button
                  type="button"
                  :data-testid="inboxActionCopy.makeCall.testId"
                  :aria-label="inboxActionCopy.makeCall.ariaLabel"
                  :disabled="isViewerRole"
                  @click="openMakeCallModal"
                  :style="tapTargetStyle"
                  :class="[
                    'min-h-[44px] rounded bg-blue-600 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                    focusRingClass,
                  ]"
                >
                  {{ inboxActionCopy.makeCall.label }}
                </button>
              </div>
            </section>

            <section
              data-testid="connectshyft-thread-panel"
              v-show="showThreadPanel"
              class="rounded-md border border-slate-200 bg-white p-3"
            >
              <button
                v-if="isMobileThreadFullscreen"
                type="button"
                data-testid="connectshyft-thread-panel-back"
                :style="tapTargetStyle"
                :class="[
                  'mb-3 inline-flex min-h-[44px] items-center rounded border border-slate-300 px-3 py-2 text-base font-medium text-slate-700',
                  focusRingClass,
                ]"
                @click="closeThreadSurface"
              >
                Back to queue
              </button>

              <div v-if="selectedThreadItem" data-testid="connectshyft-thread-surface" class="space-y-3">
                <p
                  :data-testid="`connectshyft-responsive-mode-${responsiveMode}`"
                  class="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
                >
                  Responsive mode: {{ responsiveMode }}
                </p>

                <ConnectShyftThreadHeader
                  :title="selectedThreadItem.display.title"
                  :neighbor-context-label="selectedThreadItem.display.neighborContext"
                  :conference-context-label="selectedThreadItem.display.conferenceContext"
                  :state-label="selectedThreadItem.display.stateLabel"
                  :owner-label="selectedThreadItem.state === 'CLAIMED' ? `Owner: ${selectedThreadItem.claimedByUserId || 'unassigned'}` : ''"
                  :escalation-label="selectedThreadItem.display.urgencyLabel"
                  inactivity-label="Inactivity stable"
                  :voicemail-indicator="selectedThreadItem.voicemailIndicator"
                />

                <ConnectShyftMessageBubble
                  title="Conversation summary"
                  :body="selectedThreadItem.summary"
                  :meta-label="formatQueueTimestamp(selectedThreadItem.lastActivityAtUtc)"
                />

                <ConnectShyftVoicemailCard
                  :visible="selectedThreadItem.voicemailIndicator"
                  :label="selectedThreadItem.display.voicemailLabel || 'Voicemail waiting for review'"
                />

                <ConnectShyftThreadActionBar
                  :actions="selectedThreadActions"
                  :action-pending="inlineActionPending"
                  :show-add-neighbor-action="!isViewerRole"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @action="handleInlineThreadAction"
                  @add-neighbor="handleInlineAddNeighbor"
                />

                <ConnectShyftComposer
                  v-model="inlineComposerMessage"
                  :disabled="isViewerRole"
                  :submit-disabled="inlineComposerSubmitDisabled"
                  submit-label="Send Message"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @submit="handleInlineComposerSubmit"
                />

                <p
                  data-testid="connectshyft-thread-metadata-last-inbound-number"
                  class="text-base text-slate-700"
                >
                  Inbound line: {{ selectedThreadItem.display.inboundContext }}
                </p>
                <p
                  data-testid="connectshyft-thread-metadata-preferred-outbound-number"
                  class="text-base text-slate-700"
                >
                  Outbound line: {{ selectedThreadItem.display.outboundContext }}
                </p>
              </div>

              <p v-else class="text-base text-slate-600">
                Select a thread to view details.
              </p>
            </section>

            <aside
              v-if="responsiveMode === 'desktop' && showThreadPanel"
              data-testid="connectshyft-tertiary-panel"
              class="rounded-md border border-slate-200 bg-slate-50 p-3"
            >
              <h3 class="text-base font-semibold text-slate-900">Shared identity context</h3>
              <p class="mt-1 text-base text-slate-600">
                Shared-phone indicators remain consistent across orgUnits in this tenant.
              </p>

              <p
                v-if="neighborLoadError"
                class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
              >
                {{ neighborLoadError }}
              </p>

              <ul v-else class="mt-3 space-y-2 text-base text-slate-700">
                <li
                  v-for="neighbor in neighbors"
                  :key="`desktop-${neighbor.neighborId}`"
                  class="rounded border border-slate-200 bg-white px-3 py-2"
                >
                  <p class="font-medium text-slate-900">
                    {{ neighbor.firstName || 'Neighbor' }} {{ neighbor.lastName }}
                  </p>
                  <div class="mt-1 flex flex-wrap gap-2">
                    <span
                      v-for="phone in neighbor.phones"
                      :key="`desktop-${neighbor.neighborId}-${phone.phoneId}`"
                      data-testid="connectshyft-inbox-shared-phone-indicator"
                      class="rounded px-2 py-1 text-base font-medium"
                      :class="phone.isShared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
                    >
                      {{ phone.label }} · {{ phone.isShared ? 'Shared' : 'Not shared' }}
                    </span>
                  </div>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <p
        data-testid="connectshyft-live-region-status"
        aria-live="polite"
        class="sr-only"
      >
        {{ liveRegionStatus }}
      </p>
    </section>

    <div
      v-if="sendMessageModalOpen"
      data-testid="connectshyft-send-message-modal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
    >
      <section class="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <header class="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Start new message</h2>
            <p class="mt-1 text-sm text-slate-600">
              Choose a texting-eligible neighbor phone and send the opening message.
            </p>
          </div>
          <button
            type="button"
            data-testid="connectshyft-send-message-modal-close"
            class="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700"
            :class="[focusRingClass]"
            @click="closeSendMessageModal"
          >
            Close
          </button>
        </header>

        <label
          for="connectshyft-send-message-search"
          class="block text-sm font-medium text-slate-700"
        >
          Search texting neighbors
        </label>
        <input
          id="connectshyft-send-message-search"
          v-model="sendMessageSearch"
          data-testid="connectshyft-send-message-neighbor-search-input"
          type="text"
          placeholder="Search by neighbor or phone"
          autocomplete="off"
          :class="[
            'mt-1 min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
            focusRingClass,
          ]"
          :style="tapTargetStyle"
        >

        <div class="mt-3 max-h-48 overflow-y-auto rounded border border-slate-200 p-2">
          <p
            v-if="filteredTextingEligiblePhones.length === 0"
            class="px-1 py-2 text-sm text-slate-600"
          >
            No neighbors with texting opt-in are available.
          </p>
          <label
            v-for="option in filteredTextingEligiblePhones"
            :key="option.key"
            class="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-slate-50"
          >
            <input
              v-model="selectedSendMessagePhoneKey"
              :value="option.key"
              data-testid="connectshyft-send-message-phone-option"
              type="radio"
              name="connectshyft-send-message-phone"
            >
            <span class="text-sm text-slate-800">
              {{ option.neighborLabel }} · {{ option.phoneLabel }} · {{ option.phoneValue }}
            </span>
          </label>
        </div>

        <label
          for="connectshyft-send-message-body"
          class="mt-3 block text-sm font-medium text-slate-700"
        >
          Message
        </label>
        <textarea
          id="connectshyft-send-message-body"
          v-model="sendMessageBody"
          data-testid="connectshyft-send-message-body-input"
          rows="3"
          placeholder="Type the opening message"
          :class="[
            'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
            focusRingClass,
          ]"
        />

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            :class="[focusRingClass]"
            @click="closeSendMessageModal"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="connectshyft-send-message-modal-submit"
            :disabled="sendMessagePending"
            :class="[
              'rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
              focusRingClass,
            ]"
            @click="submitSendMessageModal"
          >
            {{ sendMessagePending ? 'Sending...' : 'Send Message' }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="makeCallModalOpen"
      data-testid="connectshyft-make-call-modal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
    >
      <section class="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <header class="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Make call</h2>
            <p class="mt-1 text-sm text-slate-600">
              Dial manually or select a neighbor phone to begin a call.
            </p>
          </div>
          <button
            type="button"
            data-testid="connectshyft-make-call-modal-close"
            class="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700"
            :class="[focusRingClass]"
            @click="closeMakeCallModal"
          >
            Close
          </button>
        </header>

        <label
          for="connectshyft-call-dialpad-input"
          class="block text-sm font-medium text-slate-700"
        >
          Dialpad
        </label>
        <input
          id="connectshyft-call-dialpad-input"
          v-model="callDialpadValue"
          data-testid="connectshyft-call-dialpad-input"
          type="text"
          placeholder="+1 (260) 555-0100"
          autocomplete="off"
          :class="[
            'mt-1 min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
            focusRingClass,
          ]"
          :style="tapTargetStyle"
        >

        <div class="mt-2 grid grid-cols-3 gap-2">
          <button
            v-for="digit in dialpadDigits"
            :key="`dialpad-${digit}`"
            type="button"
            data-testid="connectshyft-call-dialpad-button"
            class="min-h-[44px] rounded border border-slate-300 bg-white text-base font-medium text-slate-800"
            :class="[focusRingClass]"
            :style="tapTargetStyle"
            @click="appendDialpadDigit(digit)"
          >
            {{ digit }}
          </button>
        </div>

        <div class="mt-2 flex gap-2">
          <button
            type="button"
            data-testid="connectshyft-call-dialpad-backspace"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            :class="[focusRingClass]"
            @click="removeDialpadDigit"
          >
            Backspace
          </button>
          <button
            type="button"
            data-testid="connectshyft-call-dialpad-clear"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            :class="[focusRingClass]"
            @click="clearDialpad"
          >
            Clear
          </button>
        </div>

        <label
          for="connectshyft-make-call-search"
          class="mt-4 block text-sm font-medium text-slate-700"
        >
          Or search neighbors
        </label>
        <input
          id="connectshyft-make-call-search"
          v-model="makeCallSearch"
          data-testid="connectshyft-make-call-neighbor-search-input"
          type="text"
          placeholder="Search by neighbor or phone"
          autocomplete="off"
          :class="[
            'mt-1 min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
            focusRingClass,
          ]"
          :style="tapTargetStyle"
        >

        <div class="mt-3 max-h-40 overflow-y-auto rounded border border-slate-200 p-2">
          <p
            v-if="filteredCallablePhones.length === 0"
            class="px-1 py-2 text-sm text-slate-600"
          >
            No callable neighbor phones are available.
          </p>
          <label
            v-for="option in filteredCallablePhones"
            :key="`call-${option.key}`"
            class="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-slate-50"
          >
            <input
              v-model="selectedCallPhoneKey"
              :value="option.key"
              data-testid="connectshyft-make-call-phone-option"
              type="radio"
              name="connectshyft-call-phone"
              @change="callDialpadValue = option.phoneValue"
            >
            <span class="text-sm text-slate-800">
              {{ option.neighborLabel }} · {{ option.phoneLabel }} · {{ option.phoneValue }}
            </span>
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            :class="[focusRingClass]"
            @click="closeMakeCallModal"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="connectshyft-make-call-modal-submit"
            :disabled="makeCallPending"
            :class="[
              'rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
              focusRingClass,
            ]"
            @click="submitMakeCallModal"
          >
            {{ makeCallPending ? 'Calling...' : 'Make Call' }}
          </button>
        </div>
      </section>
    </div>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import ConnectShyftQueueCard from '@/components/connectshyft/ConnectShyftQueueCard.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftThreadHeader from '@/components/connectshyft/ConnectShyftThreadHeader.vue';
import ConnectShyftVoicemailCard from '@/components/connectshyft/ConnectShyftVoicemailCard.vue';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
} from '@/features/connectshyft/flags';
import {
  fetchConnectShyftNeighborsCollection,
  type ConnectShyftNeighbor,
} from '@/features/connectshyft/neighbors';
import {
  fetchConnectShyftThreadBucket,
  type ConnectShyftInboxBucket,
  type ConnectShyftInboxActions,
  type ConnectShyftThreadSummary,
} from '@/features/connectshyft/readContracts';
import {
  dispatchConnectShyftThreadCall,
  dispatchConnectShyftThreadMessage,
  ensureConnectShyftThread,
  performConnectShyftThreadLifecycleAction,
} from '@/features/connectshyft/threads';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_FOCUS_RING_CLASS,
  CONNECTSHYFT_INBOX_ACTION_COPY,
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  resolveSafeVisibleThreadActions,
  sanitizeConnectShyftOperatorCopy,
} from '@/features/connectshyft/uiContracts';

const DEFAULT_THREAD_NEIGHBOR_ID = 'neighbor-connectshyft-c1-1001';
const DEFAULT_THREAD_INBOUND_NUMBER_ID = 'cs-inbound-c1-001';
const DEFAULT_THREAD_OUTBOUND_NUMBER_ID = 'cs-outbound-c1-001';

const route = useRoute();
const router = useRouter();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const neighbors = ref<ConnectShyftNeighbor[]>([]);
const threadItems = ref<ConnectShyftThreadSummary[]>([]);
const threadActions = ref<ConnectShyftInboxActions>({
  claim: false,
  takeover: false,
});
const selectedThreadId = ref<string | null>(null);
const neighborLoadError = ref('');
const threadLoadError = ref('');
const threadActionError = ref('');
const openingConversation = ref(false);
const resolvedInboxOrgUnitId = ref<string | null>(null);
const lastLoadedBucket = ref<ConnectShyftInboxBucket>('inbox');
let threadLoadRequestCounter = 0;
const viewportWidth = ref(
  typeof window === 'undefined'
    ? CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop
    : window.innerWidth,
);
const queueSearch = ref('');
const inlineComposerMessage = ref('');
const inlineActionPending = ref(false);
const sendMessageModalOpen = ref(false);
const sendMessageSearch = ref('');
const sendMessageBody = ref('');
const selectedSendMessagePhoneKey = ref('');
const sendMessagePending = ref(false);
const makeCallModalOpen = ref(false);
const makeCallSearch = ref('');
const selectedCallPhoneKey = ref('');
const callDialpadValue = ref('');
const makeCallPending = ref(false);
const dialpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'] as const;

type ConnectShyftNeighborPhoneOption = {
  key: string;
  neighborId: string;
  neighborLabel: string;
  phoneLabel: string;
  phoneValue: string;
};

const normalizeQueryValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0]);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizePhoneComparisonValue = (value: string): string => {
  return value.replace(/[^+\d]/g, '').replace(/^\+/, '');
};

const resolveNeighborLabel = (neighbor: ConnectShyftNeighbor): string => {
  const firstName = neighbor.firstName.trim();
  const lastName = neighbor.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > 0 ? fullName : 'Neighbor';
};

const bucket = computed<'inbox' | 'mine'>(() => {
  return route.path.includes('/app/connectshyft/mine') ? 'mine' : 'inbox';
});

const bucketTitle = computed(() => (bucket.value === 'mine' ? 'Mine' : 'Inbox'));
const role = computed(() => {
  const rawRole = normalizeQueryValue(route.query.tenantRole)
    || normalizeQueryValue(route.query.role)
    || '';
  return rawRole.trim().toUpperCase();
});
const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');

const responsiveMode = computed<'mobile' | 'tablet' | 'desktop'>(() => {
  if (viewportWidth.value >= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop) {
    return 'desktop';
  }

  if (viewportWidth.value >= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet) {
    return 'tablet';
  }

  return 'mobile';
});

const allNeighborPhoneOptions = computed<ConnectShyftNeighborPhoneOption[]>(() => {
  return neighbors.value.flatMap((neighbor) => {
    const neighborLabel = resolveNeighborLabel(neighbor);
    return neighbor.phones.map((phone) => ({
      key: `${neighbor.neighborId}:${phone.phoneId}`,
      neighborId: neighbor.neighborId,
      neighborLabel,
      phoneLabel: phone.label || 'phone',
      phoneValue: phone.value,
    }));
  });
});

const textingEligiblePhones = computed<ConnectShyftNeighborPhoneOption[]>(() => {
  return neighbors.value.flatMap((neighbor) => {
    if (neighbor.prefersTexting !== 'YES') {
      return [];
    }

    const neighborLabel = resolveNeighborLabel(neighbor);
    return neighbor.phones.map((phone) => ({
      key: `${neighbor.neighborId}:${phone.phoneId}`,
      neighborId: neighbor.neighborId,
      neighborLabel,
      phoneLabel: phone.label || 'phone',
      phoneValue: phone.value,
    }));
  });
});

const filteredTextingEligiblePhones = computed<ConnectShyftNeighborPhoneOption[]>(() => {
  const search = sendMessageSearch.value.trim().toLowerCase();
  if (!search) {
    return textingEligiblePhones.value;
  }

  return textingEligiblePhones.value.filter((option) => {
    const haystack = `${option.neighborLabel} ${option.phoneLabel} ${option.phoneValue}`.toLowerCase();
    return haystack.includes(search);
  });
});

const filteredCallablePhones = computed<ConnectShyftNeighborPhoneOption[]>(() => {
  const search = makeCallSearch.value.trim().toLowerCase();
  if (!search) {
    return allNeighborPhoneOptions.value;
  }

  return allNeighborPhoneOptions.value.filter((option) => {
    const haystack = `${option.neighborLabel} ${option.phoneLabel} ${option.phoneValue}`.toLowerCase();
    return haystack.includes(search);
  });
});

const normalizedQueueSearch = computed(() => queueSearch.value.trim().toLowerCase());
const visibleThreadItems = computed(() => {
  const search = normalizedQueueSearch.value;
  if (!search) {
    return threadItems.value;
  }

  return threadItems.value.filter((item) => {
    const haystack = [
      item.display.title,
      item.display.preview,
      item.summary,
      item.display.urgencyLabel,
      item.display.stateLabel,
      item.display.voicemailLabel,
      item.display.inboundContext,
      item.display.outboundContext,
      item.voicemailIndicator ? 'voicemail' : '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
});

const selectedThreadItem = computed<ConnectShyftThreadSummary | null>(() => {
  if (!selectedThreadId.value) {
    return null;
  }

  return visibleThreadItems.value.find((item) => item.threadId === selectedThreadId.value) || null;
});
const selectedThreadActions = computed<string[]>(() => {
  if (isViewerRole.value || !selectedThreadItem.value) {
    return [];
  }

  const rawActions: string[] = [];
  if (selectedThreadItem.value.state === 'CLAIMED' && threadActions.value.takeover) {
    rawActions.push('Take Over');
  }

  const visibleActions = resolveSafeVisibleThreadActions({
    state: selectedThreadItem.value.state,
    rawActions,
  });

  return visibleActions.filter((action) => {
    if (action === 'Claim') {
      return escalationAvailable.value && threadActions.value.claim;
    }
    if (action === 'Take Over') {
      return escalationAvailable.value && threadActions.value.takeover;
    }
    return true;
  });
});
const inlineComposerSubmitDisabled = computed(() => {
  const hasSendAction = selectedThreadActions.value.includes('Send Message')
    || selectedThreadActions.value.includes('Text');
  return isViewerRole.value
    || inlineActionPending.value
    || inlineComposerMessage.value.trim().length === 0
    || !hasSendAction;
});

const showThreadPanel = computed(() => selectedThreadItem.value !== null);
const isMobileThreadFullscreen = computed(
  () => responsiveMode.value === 'mobile' && showThreadPanel.value,
);

const activeLayoutMarkerTestId = computed(() => {
  if (!showThreadPanel.value) {
    return '';
  }

  if (responsiveMode.value === 'mobile') {
    return 'connectshyft-layout-mobile-thread-fullscreen';
  }

  if (responsiveMode.value === 'tablet') {
    return 'connectshyft-layout-tablet-split';
  }

  return 'connectshyft-layout-desktop-three-column';
});

const activeLayoutMarkerCopy = computed(() => {
  if (responsiveMode.value === 'mobile') {
    return 'Mobile thread is full-screen while queue remains one tap away.';
  }

  if (responsiveMode.value === 'tablet') {
    return 'Tablet split view keeps queue and thread visible together.';
  }

  return 'Desktop three-column workflow keeps queue, thread, and context visible.';
});

const layoutContainerClass = computed(() => {
  if (responsiveMode.value === 'desktop' && showThreadPanel.value) {
    return 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]';
  }

  if (responsiveMode.value !== 'mobile' && showThreadPanel.value) {
    return 'md:grid-cols-2';
  }

  return 'grid-cols-1';
});

const focusRingClass = CONNECTSHYFT_FOCUS_RING_CLASS;
const inboxActionCopy = CONNECTSHYFT_INBOX_ACTION_COPY;
const bodyTextStyle = {
  fontSize: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minBodyTextPx}px`,
};
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const buildQueueContextPills = (item: ConnectShyftThreadSummary): string[] => {
  const pills: string[] = [item.bucket === 'mine' ? 'My queue' : 'Inbox queue'];

  if (item.voicemailIndicator) {
    pills.push('Voicemail');
  }

  if (item.state === 'CLAIMED') {
    pills.push('Assigned');
  }

  if (item.state === 'CLOSED') {
    pills.push('Closed');
  }

  return pills;
};

const formatQueueTimestamp = (rawTimestamp: string): string => {
  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'Updated recently';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const syncSelectedThreadForSurface = (): void => {
  if (visibleThreadItems.value.length === 0) {
    selectedThreadId.value = null;
    return;
  }

  if (
    selectedThreadId.value
    && visibleThreadItems.value.some((item) => item.threadId === selectedThreadId.value)
  ) {
    return;
  }

  selectedThreadId.value = null;
};

const loadThreadContracts = async () => {
  const requestId = threadLoadRequestCounter + 1;
  threadLoadRequestCounter = requestId;
  const requestedBucket = bucket.value;

  if (!availability.value.capabilities.inbox) {
    if (requestId !== threadLoadRequestCounter || requestedBucket !== bucket.value) {
      return;
    }

    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    resolvedInboxOrgUnitId.value = null;
    threadLoadError.value = '';
    return;
  }

  const readResult = await fetchConnectShyftThreadBucket(requestedBucket);
  if (requestId !== threadLoadRequestCounter || requestedBucket !== bucket.value) {
    return;
  }

  if (!readResult.ok) {
    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    resolvedInboxOrgUnitId.value = null;
    threadLoadError.value = sanitizeConnectShyftOperatorCopy(
      readResult.message,
      'Unable to load ConnectShyft threads.',
    );
    return;
  }

  threadItems.value = readResult.items;
  threadActions.value = readResult.actions;
  resolvedInboxOrgUnitId.value = readResult.context?.orgUnitId
    || readResult.items[0]?.orgUnitId
    || null;
  threadLoadError.value = '';
};

const resolveInboxContext = (): {
  orgUnitId: string | null;
  neighborId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
} => {
  const query = typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const contextMode = normalizeQueryValue(query.get('context'));
  const queryOrgUnitId = contextMode === 'missing-orgunit'
    ? null
    : normalizeQueryValue(query.get('orgUnitId'));
  const orgUnitId = queryOrgUnitId
    || resolvedInboxOrgUnitId.value
    || threadItems.value[0]?.orgUnitId
    || null;

  return {
    orgUnitId,
    neighborId: normalizeQueryValue(query.get('neighborId')) || DEFAULT_THREAD_NEIGHBOR_ID,
    lastInboundCsNumberId: normalizeQueryValue(query.get('lastInboundCsNumberId'))
      || DEFAULT_THREAD_INBOUND_NUMBER_ID,
    preferredOutboundCsNumberId:
      normalizeQueryValue(query.get('preferredOutboundCsNumberId'))
      || DEFAULT_THREAD_OUTBOUND_NUMBER_ID,
  };
};

const resolveNeighborPhoneOptionByKey = (
  key: string,
  options: readonly ConnectShyftNeighborPhoneOption[],
): ConnectShyftNeighborPhoneOption | null => {
  if (!key) {
    return null;
  }

  return options.find((option) => option.key === key) || null;
};

const ensureThreadForNeighborAction = async (
  neighborId: string,
): Promise<{ threadId: string; orgUnitId: string } | null> => {
  const context = resolveInboxContext();
  if (!context.orgUnitId) {
    threadActionError.value = 'Select an orgUnit before starting a ConnectShyft conversation.';
    return null;
  }

  const ensureResult = await ensureConnectShyftThread({
    orgUnitId: context.orgUnitId,
    neighborId,
    source: 'VOICE',
    lastInboundCsNumberId: context.lastInboundCsNumberId,
    preferredOutboundCsNumberId: context.preferredOutboundCsNumberId,
  });
  if (!ensureResult.ok) {
    threadActionError.value = sanitizeConnectShyftOperatorCopy(
      ensureResult.message,
      'Unable to open a conversation right now.',
    );
    return null;
  }

  return {
    threadId: ensureResult.thread.threadId,
    orgUnitId: context.orgUnitId,
  };
};

const executeThreadActionForThread = async (input: {
  threadId: string;
  orgUnitId: string;
  action: 'claim' | 'takeover' | 'close' | 'call' | 'message';
  body?: string;
}): Promise<boolean> => {
  if (!input.threadId || !input.orgUnitId) {
    return false;
  }

  const result = input.action === 'claim'
    || input.action === 'takeover'
    || input.action === 'close'
    ? await performConnectShyftThreadLifecycleAction({
      threadId: input.threadId,
      orgUnitId: input.orgUnitId,
      action: input.action,
    })
    : input.action === 'call'
      ? await dispatchConnectShyftThreadCall({
        threadId: input.threadId,
        orgUnitId: input.orgUnitId,
      })
      : await dispatchConnectShyftThreadMessage({
        threadId: input.threadId,
        orgUnitId: input.orgUnitId,
        body: input.body || '',
      });

  if (!result.ok) {
    threadActionError.value = sanitizeConnectShyftOperatorCopy(
      result.message,
      'Unable to complete that thread action.',
    );
    return false;
  }

  threadActionError.value = '';
  await loadThreadContracts();
  selectedThreadId.value = input.threadId;
  syncSelectedThreadForSurface();
  return true;
};

const closeSendMessageModal = (): void => {
  sendMessageModalOpen.value = false;
  sendMessageSearch.value = '';
  sendMessageBody.value = '';
  selectedSendMessagePhoneKey.value = '';
};

const openSendMessageModal = (): void => {
  if (isViewerRole.value) {
    threadActionError.value = 'Send Message is unavailable for your access level.';
    return;
  }

  threadActionError.value = '';
  sendMessageSearch.value = '';
  sendMessageBody.value = '';
  selectedSendMessagePhoneKey.value = textingEligiblePhones.value[0]?.key || '';
  sendMessageModalOpen.value = true;
};

const submitSendMessageModal = async (): Promise<void> => {
  if (sendMessagePending.value || isViewerRole.value) {
    return;
  }

  const target = resolveNeighborPhoneOptionByKey(
    selectedSendMessagePhoneKey.value,
    textingEligiblePhones.value,
  );
  if (!target) {
    threadActionError.value = 'Choose a texting-eligible neighbor phone before sending.';
    return;
  }

  const body = sendMessageBody.value.trim();
  if (!body) {
    threadActionError.value = 'Enter a message before sending.';
    return;
  }

  sendMessagePending.value = true;
  try {
    const threadTarget = await ensureThreadForNeighborAction(target.neighborId);
    if (!threadTarget) {
      return;
    }

    const sent = await executeThreadActionForThread({
      threadId: threadTarget.threadId,
      orgUnitId: threadTarget.orgUnitId,
      action: 'message',
      body,
    });
    if (!sent) {
      return;
    }

    closeSendMessageModal();
    selectedThreadId.value = threadTarget.threadId;
  } finally {
    sendMessagePending.value = false;
  }
};

const closeMakeCallModal = (): void => {
  makeCallModalOpen.value = false;
  makeCallSearch.value = '';
  selectedCallPhoneKey.value = '';
  callDialpadValue.value = '';
};

const openMakeCallModal = (): void => {
  if (isViewerRole.value) {
    threadActionError.value = 'Make Call is unavailable for your access level.';
    return;
  }

  threadActionError.value = '';
  makeCallSearch.value = '';
  selectedCallPhoneKey.value = '';
  callDialpadValue.value = '';
  makeCallModalOpen.value = true;
};

const appendDialpadDigit = (digit: string): void => {
  callDialpadValue.value = `${callDialpadValue.value}${digit}`;
};

const removeDialpadDigit = (): void => {
  callDialpadValue.value = callDialpadValue.value.slice(0, -1);
};

const clearDialpad = (): void => {
  callDialpadValue.value = '';
};

const resolveDialpadTarget = (): ConnectShyftNeighborPhoneOption | null => {
  const normalizedDialpad = normalizePhoneComparisonValue(callDialpadValue.value);
  if (!normalizedDialpad) {
    return null;
  }

  return allNeighborPhoneOptions.value.find((option) => {
    return normalizePhoneComparisonValue(option.phoneValue) === normalizedDialpad;
  }) || null;
};

const submitMakeCallModal = async (): Promise<void> => {
  if (makeCallPending.value || isViewerRole.value) {
    return;
  }

  const selectedTarget =
    resolveNeighborPhoneOptionByKey(selectedCallPhoneKey.value, allNeighborPhoneOptions.value)
    || resolveDialpadTarget();
  if (!selectedTarget) {
    threadActionError.value = 'Choose a neighbor phone or dial a known neighbor number before calling.';
    return;
  }

  makeCallPending.value = true;
  try {
    const threadTarget = await ensureThreadForNeighborAction(selectedTarget.neighborId);
    if (!threadTarget) {
      return;
    }

    const called = await executeThreadActionForThread({
      threadId: threadTarget.threadId,
      orgUnitId: threadTarget.orgUnitId,
      action: 'call',
    });
    if (!called) {
      return;
    }

    closeMakeCallModal();
    selectedThreadId.value = threadTarget.threadId;
  } finally {
    makeCallPending.value = false;
  }
};

const openConversation = async (): Promise<void> => {
  const context = resolveInboxContext();
  if (!context.orgUnitId) {
    threadActionError.value = 'Select an orgUnit before opening a ConnectShyft conversation.';
    return;
  }

  openingConversation.value = true;
  threadActionError.value = '';

  try {
    const ensureResult = await ensureConnectShyftThread({
      orgUnitId: context.orgUnitId,
      neighborId: context.neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: context.lastInboundCsNumberId,
      preferredOutboundCsNumberId: context.preferredOutboundCsNumberId,
    });

    if (!ensureResult.ok) {
      threadActionError.value = sanitizeConnectShyftOperatorCopy(
        ensureResult.message,
        'Unable to open a conversation right now.',
      );
      return;
    }

    await loadThreadContracts();
    syncSelectedThreadForSurface();
  } finally {
    openingConversation.value = false;
  }
};

const loadNeighbors = async () => {
  if (!availability.value.capabilities.inbox) {
    neighbors.value = [];
    neighborLoadError.value = '';
    return;
  }

  const listResult = await fetchConnectShyftNeighborsCollection();
  if (!listResult.ok) {
    neighbors.value = [];
    neighborLoadError.value = sanitizeConnectShyftOperatorCopy(
      listResult.message,
      'Unable to load neighbor context.',
    );
    return;
  }

  neighbors.value = listResult.neighbors;
  neighborLoadError.value = '';
};

const refreshInboxSurface = async () => {
  const bucketChanged = lastLoadedBucket.value !== bucket.value;
  if (bucketChanged) {
    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    selectedThreadId.value = null;
  }
  lastLoadedBucket.value = bucket.value;

  availability.value = await fetchConnectShyftAvailability();
  await Promise.all([
    loadThreadContracts(),
    loadNeighbors(),
  ]);
  syncSelectedThreadForSurface();
};

const openThreadSurface = (threadId: string): void => {
  selectedThreadId.value = threadId;
};

const closeThreadSurface = (): void => {
  selectedThreadId.value = null;
};

const handleInlineThreadAction = async (action: string): Promise<void> => {
  const selected = selectedThreadItem.value;
  if (!selected || inlineActionPending.value) {
    return;
  }

  if (action === 'Text' || action === 'Send Message') {
    await handleInlineComposerSubmit();
    return;
  }

  const actionMap: Record<string, 'claim' | 'takeover' | 'close' | 'call'> = {
    Claim: 'claim',
    'Take Over': 'takeover',
    Close: 'close',
    Call: 'call',
  };
  const mappedAction = actionMap[action];
  if (!mappedAction) {
    threadActionError.value = `Unsupported thread action: ${action}`;
    return;
  }

  inlineActionPending.value = true;
  try {
    await executeThreadActionForThread({
      threadId: selected.threadId,
      orgUnitId: selected.orgUnitId,
      action: mappedAction,
    });
  } finally {
    inlineActionPending.value = false;
  }
};

const handleInlineAddNeighbor = (): void => {
  if (isViewerRole.value) {
    threadActionError.value = 'Add Neighbor is unavailable for your access level.';
    return;
  }

  threadActionError.value = '';
  void router.push(buildNeighborCreatePath());
};

const handleInlineComposerSubmit = async (): Promise<void> => {
  const selected = selectedThreadItem.value;
  if (!selected || inlineActionPending.value) {
    return;
  }

  const message = inlineComposerMessage.value.trim();
  if (!message) {
    threadActionError.value = 'Enter a message before sending.';
    return;
  }

  inlineActionPending.value = true;
  try {
    const sent = await executeThreadActionForThread({
      threadId: selected.threadId,
      orgUnitId: selected.orgUnitId,
      action: 'message',
      body: message,
    });
    if (sent) {
      inlineComposerMessage.value = '';
    }
  } finally {
    inlineActionPending.value = false;
  }
};

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
};

onMounted(() => {
  queueSearch.value = normalizeQueryValue(route.query.queueSearch) || '';
  updateViewportWidth();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth);
  }
  void refreshInboxSurface();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth);
  }
});

const refreshRouteKey = computed(() => {
  return [
    route.path,
    normalizeQueryValue(route.query.tenantId) || '',
    normalizeQueryValue(route.query.orgUnitId) || '',
    normalizeQueryValue(route.query.tenantRole) || '',
    normalizeQueryValue(route.query.role) || '',
    normalizeQueryValue(route.query.actorUserId) || '',
    normalizeQueryValue(route.query.userId) || '',
    normalizeQueryValue(route.query.flags) || '',
    normalizeQueryValue(route.query.orgUnitMemberships) || '',
    normalizeQueryValue(route.query.context) || '',
    normalizeQueryValue(route.query.providerKey) || '',
    normalizeQueryValue(route.query.requestedProvider) || '',
    normalizeQueryValue(route.query.provider) || '',
  ].join('|');
});

watch(refreshRouteKey, () => {
  void refreshInboxSurface();
});

watch(
  () => route.query.queueSearch,
  (value) => {
    const next = normalizeQueryValue(value) || '';
    if (next !== queueSearch.value) {
      queueSearch.value = next;
    }
  },
);

watch(queueSearch, (value) => {
  const normalized = value.trim();
  const current = normalizeQueryValue(route.query.queueSearch) || '';
  if (normalized === current) {
    return;
  }

  const nextQuery = { ...route.query };
  if (normalized.length > 0) {
    nextQuery.queueSearch = normalized;
  } else {
    delete nextQuery.queueSearch;
  }

  void router.replace({
    path: route.path,
    query: nextQuery,
  });
});

watch(selectedThreadId, () => {
  inlineComposerMessage.value = '';
});

watch(bucket, () => {
  threadItems.value = [];
  threadActions.value = {
    claim: false,
    takeover: false,
  };
  selectedThreadId.value = null;
}, { flush: 'sync' });

watch([visibleThreadItems, responsiveMode], () => {
  syncSelectedThreadForSurface();
}, { deep: true });

watch(filteredTextingEligiblePhones, (options) => {
  if (!sendMessageModalOpen.value) {
    return;
  }

  const current = resolveNeighborPhoneOptionByKey(selectedSendMessagePhoneKey.value, options);
  if (!current) {
    selectedSendMessagePhoneKey.value = options[0]?.key || '';
  }
});

watch(filteredCallablePhones, (options) => {
  if (!makeCallModalOpen.value) {
    return;
  }

  const current = resolveNeighborPhoneOptionByKey(selectedCallPhoneKey.value, options);
  if (!current) {
    selectedCallPhoneKey.value = options[0]?.key || '';
  }
});

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const escalationAvailable = computed(() => availability.value.capabilities.escalation);
const webhooksAvailable = computed(() => availability.value.capabilities.webhooks);

const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return availability.value.refusal.message;
  }

  if (!moduleAvailable.value) {
    if (availability.value.entitlement && availability.value.entitlement.enabled === false) {
      return 'ConnectShyft module entitlement is disabled for this tenant.';
    }

    return 'ConnectShyft is currently unavailable for this tenant. Contact an administrator to restore access.';
  }

  return 'ConnectShyft inbox is currently unavailable for this tenant.';
});

const maintenanceBanner = computed(() => {
  if (!moduleAvailable.value || !inboxAvailable.value) {
    return '';
  }

  if (!escalationAvailable.value) {
    return 'Escalation controls are temporarily unavailable for this tenant.';
  }

  return '';
});

const liveRegionStatus = computed(() => {
  if (threadActionError.value) {
    return `Refusal feedback. ${threadActionError.value}`;
  }
  if (threadLoadError.value) {
    return `Error feedback. ${threadLoadError.value}`;
  }
  return '';
});

const buildNeighborCreatePath = (): string => {
  if (typeof window === 'undefined') {
    return '/app/connectshyft/neighbors/new';
  }

  const currentQuery = new URLSearchParams(window.location.search);
  const queryString = currentQuery.toString();
  const basePath = '/app/connectshyft/neighbors/new';

  return queryString.length > 0
    ? `${basePath}?${queryString}`
    : basePath;
};
</script>
