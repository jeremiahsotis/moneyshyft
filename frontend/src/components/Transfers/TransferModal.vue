<template>
  <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="$emit('close')"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <form @submit.prevent="submitTransfer">
          <div>
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
               <svg class="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
               </svg>
            </div>
            <div class="mt-3 text-center sm:mt-5">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Transfer Money</h3>
              <div class="mt-2 text-left">
                
                <div v-if="error" class="mb-4 bg-red-50 p-4 rounded-md">
                  <div class="flex">
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
                    </div>
                  </div>
                </div>

                <!-- From Account -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700">From Account</label>
                  <select v-model="form.from_account_id" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option :value="null" disabled>Select Source Account</option>
                    <option v-for="account in accounts" :key="account.id" :value="account.id">
                      {{ account.name }} ({{ formatCurrency(account.current_balance) }})
                    </option>
                  </select>
                </div>

                <!-- To Account -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700">To Account</label>
                  <select v-model="form.to_account_id" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option :value="null" disabled>Select Destination Account</option>
                    <option v-for="account in availableToAccounts" :key="account.id" :value="account.id">
                      {{ account.name }} ({{ formatCurrency(account.current_balance) }})
                    </option>
                  </select>
                </div>

                <!-- Amount -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700">Amount</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input v-model.number="form.amount" type="number" min="0.01" step="0.01" required class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md" placeholder="0.00">
                  </div>
                </div>

                <!-- Date -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700">Date</label>
                  <input v-model="form.transaction_date" type="date" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>

                <!-- Notes -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <textarea v-model="form.notes" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                </div>
                
              </div>
            </div>
          </div>
          <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button type="submit" :disabled="isLoading" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm">
              {{ isLoading ? 'Processing...' : 'Transfer' }}
            </button>
            <button type="button" @click="$emit('close')" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import api from '@/services/api';

const props = defineProps<{
  accounts: any[];
}>();

const emit = defineEmits(['close', 'success']);

const isLoading = ref(false);
const error = ref<string | null>(null);

const form = reactive({
  from_account_id: null as string | null,
  to_account_id: null as string | null,
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  notes: ''
});

// Filter out the selected "from" account so you can't transfer to self
const availableToAccounts = computed(() => {
  if (!form.from_account_id) return props.accounts;
  return props.accounts.filter(a => a.id !== form.from_account_id);
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

async function submitTransfer() {
  if (!form.from_account_id || !form.to_account_id || form.amount <= 0) {
    return;
  }
  
  isLoading.value = true;
  error.value = null;

  try {
    await api.post('/transactions/transfer', {
      from_account_id: form.from_account_id,
      to_account_id: form.to_account_id,
      amount: form.amount,
      transaction_date: form.transaction_date,
      notes: form.notes
    });
    emit('success');
    emit('close');
  } catch (e: any) {
    error.value = e.response?.data?.message || e.response?.data?.error || 'Failed to process transfer';
  } finally {
    isLoading.value = false;
  }
}
</script>
