<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          Let's start with your income 💰
        </h2>
        <InfoTooltip text="Your income helps us plan how much you can assign each month." />
      </div>
      <p class="text-gray-600">
        Tell us about the money you bring in each month. This helps us understand how much you have to work with.
      </p>
    </div>

    <div class="space-y-6 mb-6">
      <div
        v-for="(source, index) in sources"
        :key="index"
        class="p-4 border border-gray-200 rounded-lg space-y-3"
      >
        <!-- Income source name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Income source name
          </label>
          <input
            v-model="source.name"
            type="text"
            placeholder="e.g., Primary Job, Side Gig"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p class="text-xs text-gray-500 mt-1">💡 Tip: Give it a name you'll recognize</p>
        </div>

        <!-- Pay frequency -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Pay frequency
          </label>
          <select
            v-model="source.frequency"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="hourly">Hourly</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly (every 2 weeks)</option>
            <option value="semimonthly">Semi-monthly (twice per month)</option>
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
        </div>

        <!-- Expected pay day for monthly -->
        <div v-if="source.frequency === 'monthly'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Expected pay day of month
          </label>
          <input
            v-model.number="source.expectedDayOfMonth"
            type="number"
            min="1"
            max="31"
            placeholder="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p class="text-xs text-gray-500 mt-1">Helps us recognize regular income.</p>
        </div>

        <!-- Last payment date for weekly/biweekly -->
        <div v-if="source.frequency === 'weekly' || source.frequency === 'biweekly'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Last payment date
          </label>
          <input
            v-model="source.lastPaymentDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p class="text-xs text-gray-500 mt-1">Used to predict your next expected deposit.</p>
        </div>

        <!-- Hours per week (only for hourly) -->
        <div v-if="source.frequency === 'hourly'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Hours per week
          </label>
          <input
            v-model.number="source.hoursPerWeek"
            type="number"
            step="1"
            min="0"
            max="168"
            placeholder="40"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <!-- Amount input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ getAmountLabel(source.frequency) }}
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">$</span>
            <input
              v-model.number="source.amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <!-- Monthly conversion preview -->
        <div v-if="source.amount > 0" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-sm text-green-800 font-medium">
            📊 Monthly income: {{ formatCurrency(convertToMonthly(source)) }}
          </p>
          <p v-if="source.frequency !== 'monthly'" class="text-xs text-green-700 mt-1">
            <template v-if="source.frequency === 'hourly'">
              {{ formatCurrency(source.amount) }}/hour × {{ source.hoursPerWeek }} hours/week
            </template>
            <template v-else-if="source.frequency === 'weekly'">
              {{ formatCurrency(source.amount) }}/week × 52 weeks ÷ 12 months
            </template>
            <template v-else-if="source.frequency === 'biweekly'">
              {{ formatCurrency(source.amount) }}/paycheck × 26 paychecks ÷ 12 months
            </template>
            <template v-else-if="source.frequency === 'semimonthly'">
              {{ formatCurrency(source.amount) }}/paycheck × 2 paychecks/month
            </template>
            <template v-else-if="source.frequency === 'annually'">
              {{ formatCurrency(source.amount) }}/year ÷ 12 months
            </template>
          </p>
        </div>

        <!-- Remove button -->
        <div v-if="sources.length > 1" class="text-right">
          <button
            @click="removeSource(index)"
            class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            🗑️ Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Add another source button -->
    <button
      @click="addSource"
      class="mb-6 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition font-medium"
    >
      + Add another income source
    </button>

    <!-- Total display -->
    <div v-if="totalIncome > 0" class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Total monthly income:</span>
        <span class="text-2xl font-bold text-primary-600">
          {{ formatCurrency(totalIncome) }}
        </span>
      </div>
    </div>

    <!-- Helper text -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        💡 <strong>Don't know the exact amount?</strong> Check your last 2-3 months of bank statements or pay stubs to get an average. It's okay to estimate!
      </p>
    </div>

    <!-- Navigation buttons -->
    <div class="flex gap-3 justify-between">
      <button
        @click="$emit('back')"
        class="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
      >
        ← Back
      </button>

      <button
        @click="handleNext"
        :disabled="!isValid"
        class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue →
      </button>
    </div>

    <!-- Skip option -->
    <div class="mt-4 text-center">
      <button
        @click="handleSkip"
        class="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Not now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '@/stores/wizard';

const emit = defineEmits<{
  next: [data: { sources: Array<{
    name: string;
    monthly_amount: number;
    frequency?: 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually';
    expected_day_of_month?: number | null;
    hours_per_week?: number | null;
    last_payment_date?: string | null;
  }> }];
  back: [];
}>();

const wizardStore = useWizardStore();

interface IncomeSource {
  name: string;
  amount: number;
  frequency: 'monthly' | 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'annually';
  hoursPerWeek?: number;
  expectedDayOfMonth?: number | null;
  lastPaymentDate?: string | null;
}

const sources = ref<IncomeSource[]>([
  { name: '', amount: 0, frequency: 'monthly', hoursPerWeek: 40, expectedDayOfMonth: 1, lastPaymentDate: null }
]);

onMounted(() => {
  // Pre-populate from stored answers if they exist
  if (wizardStore.answers.income_sources && wizardStore.answers.income_sources.length > 0) {
    sources.value = wizardStore.answers.income_sources.map(s => ({ 
      name: s.name,
      amount: (s as any).monthly_amount ?? (s as any).amount ?? 0,
      frequency: s.frequency || 'monthly',
      hoursPerWeek: s.hours_per_week ?? 40,
      expectedDayOfMonth: s.expected_day_of_month ?? 1,
      lastPaymentDate: s.last_payment_date ?? null
    }));
  }
});

// Convert any frequency to monthly amount
function convertToMonthly(source: IncomeSource): number {
  const { amount, frequency, hoursPerWeek = 40 } = source;
  if (!amount) return 0;

  switch (frequency) {
    case 'hourly':
      return amount * hoursPerWeek * 52 / 12;
    case 'weekly':
      return amount * 52 / 12;
    case 'biweekly':
      return amount * 26 / 12;
    case 'semimonthly':
      return amount * 2;
    case 'annually':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
}

// Get label for amount input based on frequency
function getAmountLabel(frequency: string): string {
  const labels: Record<string, string> = {
    hourly: 'Hourly Rate',
    weekly: 'Weekly Pay',
    biweekly: 'Pay Per Paycheck',
    semimonthly: 'Pay Per Paycheck',
    monthly: 'Monthly Income',
    annually: 'Annual Salary'
  };
  return labels[frequency] || 'Amount';
}

const totalIncome = computed(() => {
  return sources.value.reduce((sum, s) => sum + convertToMonthly(s), 0);
});

const isValid = computed(() => {
  return sources.value.some(s => {
    const hasName = s.name.trim().length > 0;
    const hasAmount = s.amount > 0;
    const hasHoursIfHourly = s.frequency !== 'hourly' || (s.hoursPerWeek && s.hoursPerWeek > 0);
    const hasExpectedDayIfMonthly = s.frequency !== 'monthly' || (!!s.expectedDayOfMonth && s.expectedDayOfMonth >= 1 && s.expectedDayOfMonth <= 31);
    const hasLastPaymentIfWeekly = !['weekly', 'biweekly'].includes(s.frequency) || !!s.lastPaymentDate;
    return hasName && hasAmount && hasHoursIfHourly && hasExpectedDayIfMonthly && hasLastPaymentIfWeekly;
  });
});

function addSource() {
  sources.value.push({ name: '', amount: 0, frequency: 'monthly', hoursPerWeek: 40, expectedDayOfMonth: 1, lastPaymentDate: null });
}

function removeSource(index: number) {
  sources.value.splice(index, 1);
}

function handleNext() {
  const validSources = sources.value
    .filter(s => s.name.trim() && s.amount > 0)
    .map(s => ({
      name: s.name,
      monthly_amount: convertToMonthly(s),
      frequency: s.frequency,
      expected_day_of_month: s.frequency === 'monthly' ? (s.expectedDayOfMonth ?? null) : null,
      hours_per_week: s.frequency === 'hourly' ? (s.hoursPerWeek ?? null) : null,
      last_payment_date: ['weekly', 'biweekly'].includes(s.frequency) ? (s.lastPaymentDate ?? null) : null
    }));
  emit('next', { sources: validSources });
}

function handleSkip() {
  emit('next', { sources: [] });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
