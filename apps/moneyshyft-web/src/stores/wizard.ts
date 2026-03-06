import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WizardAnswers } from '@/types';

export const useWizardStore = defineStore('wizard', () => {
  const STORAGE_KEY = 'msyft_wizard_progress';

  // State
  const currentStep = ref(0);
  const answers = ref<Partial<WizardAnswers>>({
    income_sources: [],
    credit_card_debts: [],
    other_debts: [],
  });
  const isCompleted = ref(false);

  // Actions
  function setStep(step: number): void {
    currentStep.value = step;
  }

  function nextStep(): void {
    currentStep.value++;
  }

  function prevStep(): void {
    if (currentStep.value > 0) {
      currentStep.value--;
    }
  }

  function updateAnswers(data: Partial<WizardAnswers>): void {
    answers.value = { ...answers.value, ...data };
  }

  function reset(): void {
    currentStep.value = 0;
    answers.value = {
      income_sources: [],
      credit_card_debts: [],
      other_debts: [],
    };
    isCompleted.value = false;
    clearProgress();
  }

  function markComplete(): void {
    isCompleted.value = true;
    clearProgress();
  }

  function saveProgress(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentStep: currentStep.value,
          answers: answers.value,
        })
      );
    } catch (error) {
      console.error('Failed to save wizard progress:', error);
    }
  }

  function loadProgress(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      const parsed = JSON.parse(saved) as { currentStep: number; answers: Partial<WizardAnswers> };
      if (typeof parsed.currentStep === 'number') {
        currentStep.value = parsed.currentStep;
      }
      if (parsed.answers) {
        answers.value = { ...answers.value, ...parsed.answers };
      }
      return true;
    } catch (error) {
      console.error('Failed to load wizard progress:', error);
      return false;
    }
  }

  function clearProgress(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wizard progress:', error);
    }
  }

  return {
    currentStep,
    answers,
    isCompleted,
    setStep,
    nextStep,
    prevStep,
    updateAnswers,
    reset,
    markComplete,
    saveProgress,
    loadProgress,
    clearProgress,
  };
});
