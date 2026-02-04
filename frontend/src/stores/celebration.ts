import { defineStore } from 'pinia';
import { ref } from 'vue';

type Celebration = {
  message: string;
  emoji?: string;
};

export const useCelebrationStore = defineStore('celebration', () => {
  const current = ref<Celebration | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function show(message: string, emoji = '🎉', durationMs = 4000) {
    clearTimer();
    current.value = { message, emoji };
    timer = setTimeout(() => {
      current.value = null;
      timer = null;
    }, durationMs);
  }

  function clear() {
    clearTimer();
    current.value = null;
  }

  return {
    current,
    show,
    clear,
  };
});
