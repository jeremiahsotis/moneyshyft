<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
    <!-- Success Modal with Invitation Code -->
    <div
      v-if="showInvitationCode"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="handleContinue"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 transform transition-all" @click.stop>
        <div class="text-center mb-6">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Welcome to MoneyShyft!</h2>
          <p class="text-gray-600">Your account has been created successfully</p>
        </div>

        <div class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 mb-6">
          <p class="text-sm font-medium text-gray-700 mb-3 text-center">
            Your Household Invitation Code
          </p>
          <div class="bg-white rounded-lg p-4 mb-3">
            <p class="text-4xl font-bold text-primary-600 text-center tracking-widest font-mono">
              {{ invitationCode }}
            </p>
          </div>
          <p class="text-xs text-gray-600 text-center">
            Share this code with family members to invite them to your household
          </p>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p class="text-sm text-blue-800">
            <strong>💡 Tip:</strong> You can find this code anytime in your household settings.
          </p>
        </div>

        <button
          @click="handleContinue"
          class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition shadow-md"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>

    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900">MoneyShyft</h1>
        <p class="mt-2 text-sm text-gray-600">Create your account</p>
      </div>

      <form @submit.prevent="handleSignup" class="mt-8 space-y-6">
        <div v-if="authStore.error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {{ authStore.error }}
        </div>
        <div v-if="validationError" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <strong>Validation Error:</strong> {{ validationError }}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
            <input
              id="firstName"
              v-model="firstName"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              id="lastName"
              v-model="lastName"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="8"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          <p class="mt-1 text-xs text-gray-500">At least 8 characters</p>
        </div>

        <!-- Household Mode Selection -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">Household</label>
          <div class="flex gap-4">
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="householdMode"
                value="create"
                class="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm">Create new household</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="householdMode"
                value="join"
                class="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm">Join existing household</span>
            </label>
          </div>

          <!-- Create Mode: Household Name -->
          <div v-if="householdMode === 'create'">
            <input
              id="householdName"
              v-model="householdName"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Smith Family (Optional)"
            />
            <p class="mt-1 text-xs text-gray-500">Leave blank to create household later</p>
          </div>

          <!-- Join Mode: Invitation Code -->
          <div v-if="householdMode === 'join'">
            <input
              id="joinCode"
              v-model="joinInvitationCode"
              type="text"
              maxlength="6"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 uppercase tracking-widest font-mono text-center text-lg"
              placeholder="ABC123"
              @input="joinInvitationCode = joinInvitationCode.toUpperCase()"
            />
            <p class="mt-1 text-xs text-gray-500">Enter the 6-character code from your family member</p>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.isLoading"
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="authStore.isLoading">Creating account...</span>
          <span v-else>Sign up</span>
        </button>

        <div class="text-center">
          <router-link to="/login" class="text-sm text-primary-600 hover:text-primary-700">
            Already have an account? Log in
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const householdMode = ref<'create' | 'join'>('create');
const householdName = ref('');
const joinInvitationCode = ref('');
const validationError = ref('');
const showInvitationCode = ref(false);
const invitationCode = ref('');

async function handleSignup() {
  validationError.value = '';
  authStore.clearError();

  // Frontend validation
  if (password.value.length < 8) {
    validationError.value = 'Password must be at least 8 characters long';
    return;
  }

  // Validate join mode requires invitation code
  if (householdMode.value === 'join' && !joinInvitationCode.value) {
    validationError.value = 'Please enter an invitation code';
    return;
  }

  try {
    const signupData: any = {
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
    };

    // Add either householdName or invitationCode based on mode
    if (householdMode.value === 'create') {
      signupData.householdName = householdName.value || undefined;
    } else {
      signupData.invitationCode = joinInvitationCode.value;
    }

    const code = await authStore.signup(signupData);

    // If invitation code was returned (new household created), show modal
    // Don't show modal if user joined via invitation code
    if (code && householdMode.value === 'create') {
      invitationCode.value = code;
      showInvitationCode.value = true;
    } else {
      // No household created, go straight to dashboard
      router.push('/');
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.response?.data?.details) {
      validationError.value = error.response.data.details.map((d: any) => d.message).join(', ');
    }
  }
}

function handleContinue() {
  showInvitationCode.value = false;
  router.push('/');
}
</script>
