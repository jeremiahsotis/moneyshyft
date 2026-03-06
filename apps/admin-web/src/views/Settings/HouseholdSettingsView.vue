<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Household Settings</h1>
        <p class="mt-2 text-gray-600">Manage your household information and invite family members</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p class="text-gray-600">Loading household information...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-800 font-semibold">⚠️ Error Loading Settings</p>
        <p class="text-red-700 mt-1">{{ error }}</p>
        <button
          @click="loadHouseholdData"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Household Info Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Household Information</h2>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Household Name</label>
              <p class="text-lg font-medium text-gray-900">{{ householdData?.name || 'Not set' }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">Members</label>
              <p class="text-lg font-medium text-gray-900">{{ householdData?.memberCount || 0 }} member(s)</p>
            </div>
          </div>
        </div>

        <!-- Invitation Code Card -->
        <div class="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Family Invitation Code</h2>
          <p class="text-sm text-gray-600 mb-4">Share this code with family members to invite them to your household</p>

          <div class="bg-white rounded-lg p-6 mb-4">
            <p class="text-5xl font-bold text-primary-600 text-center tracking-widest font-mono">
              {{ householdData?.invitationCode || '------' }}
            </p>
          </div>

          <button
            @click="copyInvitationCode"
            :disabled="!householdData?.invitationCode"
            class="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <svg v-if="!copied" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ copied ? 'Copied!' : 'Copy Code' }}</span>
          </button>

          <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">
              <strong>💡 How to invite:</strong> Send this code to your family members. They can enter it when signing up to join your household.
            </p>
          </div>
        </div>

        <!-- Extra Money Settings -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Extra Money Detection</h2>
          <p class="text-sm text-gray-600 mb-4">
            Set the minimum amount that should trigger extra money detection.
          </p>
          <div class="flex items-center gap-4">
            <div class="flex-1">
              <label class="block text-sm text-gray-600 mb-1">Detection Threshold</label>
              <div class="flex items-center gap-2">
                <span class="text-gray-500">$</span>
                <input
                  v-model.number="extraMoneyThreshold"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Default is $100. Transactions below this amount won’t be flagged.
              </p>
            </div>
            <button
              @click="saveSettings"
              :disabled="isSavingSettings"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {{ isSavingSettings ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>

        <ExtraMoneyPlanSettings />

        <TransactionTagsSettings />

        <CategorySettings />

        <!-- Household Members Card (optional - can be added later) -->
        <!-- Future enhancement: List all household members with their roles -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import ExtraMoneyPlanSettings from '@/components/settings/ExtraMoneyPlanSettings.vue';
import TransactionTagsSettings from '@/components/settings/TransactionTagsSettings.vue';
import CategorySettings from '@/components/settings/CategorySettings.vue';

interface HouseholdData {
  name: string;
  invitationCode: string;
  memberCount: number;
}

interface HouseholdSettings {
  extra_money_threshold: number;
}

const isLoading = ref(false);
const error = ref<string | null>(null);
const householdData = ref<HouseholdData | null>(null);
const copied = ref(false);
const extraMoneyThreshold = ref(100);
const isSavingSettings = ref(false);

async function loadHouseholdData() {
  isLoading.value = true;
  error.value = null;

  try {
    const [householdResponse, settingsResponse] = await Promise.all([
      api.get('/households/current'),
      api.get('/settings')
    ]);

    const response = householdResponse;
    householdData.value = {
      name: response.data.name,
      invitationCode: response.data.invitation_code,
      memberCount: response.data.member_count || 1
    };

    const settings = settingsResponse.data.data as HouseholdSettings;
    if (settings?.extra_money_threshold !== undefined && settings?.extra_money_threshold !== null) {
      extraMoneyThreshold.value = Number(settings.extra_money_threshold);
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Failed to load household data';
  } finally {
    isLoading.value = false;
  }
}

async function copyInvitationCode() {
  if (!householdData.value?.invitationCode) return;

  try {
    await navigator.clipboard.writeText(householdData.value.invitationCode);
    copied.value = true;

    // Reset copied state after 2 seconds
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    alert('Failed to copy code. Please copy manually.');
  }
}

async function saveSettings() {
  isSavingSettings.value = true;
  try {
    await api.patch('/settings', {
      extra_money_threshold: extraMoneyThreshold.value
    });
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to save settings');
  } finally {
    isSavingSettings.value = false;
  }
}

onMounted(() => {
  loadHouseholdData();
});
</script>
