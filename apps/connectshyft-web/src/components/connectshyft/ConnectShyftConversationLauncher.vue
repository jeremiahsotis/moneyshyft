<template>
  <SurfaceCard
    data-testid="connectshyft-conversation-launcher"
    padding="default"
    panel
    tone="soft"
  >
    <div class="flex flex-col gap-5">
      <SectionHeader
        eyebrow="Conversation Launcher"
        title="Choose who to reach"
        description="Search or enter a phone number first, then choose whether to call or text."
        size="md"
      >
        <template #actions>
          <ActionButton
            type="button"
            tone="secondary"
            :style="tapTargetStyle"
            :class="focusRingClass"
            @click="$emit('close')"
          >
            Close
          </ActionButton>
        </template>
      </SectionHeader>

      <SearchField
        :model-value="query"
        test-id="connectshyft-conversation-launcher-search"
        label="Who do you want to reach?"
        placeholder="Search by name or enter a phone number"
        hint="Recent contacts are only shown for you in this workspace."
        @update:model-value="$emit('update:query', $event)"
      />

      <p
        v-if="errorMessage"
        data-testid="connectshyft-conversation-launcher-error"
        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
      >
        {{ errorMessage }}
      </p>

      <section
        v-if="selectedTarget"
        data-testid="connectshyft-conversation-launcher-selection"
        class="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 space-y-1">
            <p class="cs-kicker">Ready to start</p>
            <p class="cs-heading-md">
              {{ selectedTarget.displayName }}
            </p>
            <p class="cs-body">
              {{ selectedTarget.detailLabel }}
            </p>
          </div>

          <ActionButton
            type="button"
            tone="secondary"
            :style="tapTargetStyle"
            :class="focusRingClass"
            @click="$emit('clear-target')"
          >
            Change
          </ActionButton>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionButton
            type="button"
            data-testid="connectshyft-conversation-launcher-call"
            tone="secondary"
            :disabled="pending"
            :style="tapTargetStyle"
            :class="focusRingClass"
            @click="$emit('launch', 'call')"
          >
            {{ pending ? 'Starting...' : 'Call' }}
          </ActionButton>

          <ActionButton
            type="button"
            data-testid="connectshyft-conversation-launcher-text"
            tone="primary"
            :disabled="pending"
            :style="tapTargetStyle"
            :class="focusRingClass"
            @click="$emit('launch', 'text')"
          >
            {{ pending ? 'Starting...' : 'Text' }}
          </ActionButton>
        </div>
      </section>

      <section
        v-if="!selectedTarget && recentTargets.length > 0 && !query.trim().length"
        data-testid="connectshyft-conversation-launcher-recents"
        class="space-y-3"
      >
        <p class="cs-kicker">Your recent contacts</p>
        <ul class="space-y-2">
          <li
            v-for="target in recentTargets"
            :key="`recent-${target.targetId}`"
          >
            <button
              type="button"
              :data-testid="`connectshyft-conversation-launcher-recent-${target.targetId}`"
              :class="[
                'flex min-h-[44px] w-full items-start justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/95 px-4 py-3 text-left shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]',
                focusRingClass,
              ]"
              :style="tapTargetStyle"
              @click="$emit('select-target', target)"
            >
              <span class="min-w-0">
                <span class="block text-base font-semibold text-slate-900">
                  {{ target.displayName }}
                </span>
                <span class="mt-1 block text-sm text-slate-500">
                  {{ target.detailLabel }}
                </span>
              </span>
              <span class="text-sm font-medium text-emerald-700">Choose</span>
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="!selectedTarget"
        data-testid="connectshyft-conversation-launcher-targets"
        class="space-y-3"
      >
        <p class="cs-kicker">
          {{ query.trim().length > 0 ? 'Matches' : 'Contacts' }}
        </p>

        <ul
          v-if="targets.length > 0"
          class="space-y-2"
        >
          <li
            v-for="target in targets"
            :key="target.targetId"
          >
            <button
              type="button"
              :data-testid="`connectshyft-conversation-launcher-target-${target.targetId}`"
              :class="[
                'flex min-h-[44px] w-full items-start justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/95 px-4 py-3 text-left shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]',
                focusRingClass,
              ]"
              :style="tapTargetStyle"
              @click="$emit('select-target', target)"
            >
              <span class="min-w-0">
                <span class="block text-base font-semibold text-slate-900">
                  {{ target.displayName }}
                </span>
                <span class="mt-1 block text-sm text-slate-500">
                  {{ target.detailLabel }}
                </span>
              </span>
              <span class="text-sm font-medium text-emerald-700">Choose</span>
            </button>
          </li>
        </ul>

        <EmptyStatePanel
          v-else
          eyebrow="Conversation Launcher"
          title="Enter a full phone number to reach someone new"
          description="As soon as you choose call or text, the conversation will be attached to the right thread."
        />
      </section>
    </div>
  </SurfaceCard>
</template>

<script setup lang="ts">
import type { ConnectShyftConversationLauncherTarget } from '@/features/connectshyft/conversationLauncher';
import ActionButton from '@/components/ui/ActionButton.vue';
import EmptyStatePanel from '@/components/ui/EmptyStatePanel.vue';
import SearchField from '@/components/ui/SearchField.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';

defineProps<{
  query: string;
  targets: ConnectShyftConversationLauncherTarget[];
  recentTargets: ConnectShyftConversationLauncherTarget[];
  selectedTarget: ConnectShyftConversationLauncherTarget | null;
  pending: boolean;
  errorMessage: string;
  focusRingClass: string;
  tapTargetStyle: Record<string, string>;
}>();

defineEmits<{
  close: [];
  'clear-target': [];
  launch: [channel: 'call' | 'text'];
  'select-target': [target: ConnectShyftConversationLauncherTarget];
  'update:query': [value: string];
}>();
</script>
