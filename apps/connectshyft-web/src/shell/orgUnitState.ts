import { readonly, ref } from 'vue';

const activeShellOrgUnitId = ref('');

export const useActiveShellOrgUnitId = () => readonly(activeShellOrgUnitId);

export const readActiveShellOrgUnitId = (): string => activeShellOrgUnitId.value;

export const setActiveShellOrgUnitId = (orgUnitId: string): void => {
  activeShellOrgUnitId.value = orgUnitId.trim();
};

export const resetActiveShellOrgUnitIdForTests = (): void => {
  activeShellOrgUnitId.value = '';
};
