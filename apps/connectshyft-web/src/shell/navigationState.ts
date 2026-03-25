import { readonly, ref } from 'vue';

const shellNavigationPending = ref(false);

export const beginShellNavigation = (): void => {
  shellNavigationPending.value = true;
};

export const endShellNavigation = (): void => {
  shellNavigationPending.value = false;
};

export const useShellNavigationState = () => readonly(shellNavigationPending);
