import { defineStore } from 'pinia';
import { ref } from 'vue';

type UndoAction = {
  id: string;
  message: string;
  onCommit: () => Promise<void> | void;
  timeoutMs: number;
};

export const useUndoStore = defineStore('undo', () => {
  const current = ref<UndoAction | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function commit(action?: UndoAction | null) {
    const target = action || current.value;
    if (!target) return;
    clearTimer();
    current.value = null;
    try {
      await target.onCommit();
    } catch (error) {
      console.error('Undo action failed:', error);
    }
  }

  function schedule(options: Omit<UndoAction, 'id'>): string {
    if (current.value) {
      void commit(current.value);
    }

    const action: UndoAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...options,
    };

    current.value = action;
    timer = setTimeout(() => {
      if (current.value?.id === action.id) {
        void commit(action);
      }
    }, action.timeoutMs);

    return action.id;
  }

  function undo() {
    clearTimer();
    current.value = null;
  }

  return {
    current,
    schedule,
    undo,
    commit,
  };
});
