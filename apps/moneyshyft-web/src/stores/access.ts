import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { evaluateRbac } from '@/services/platformAdmin';

const SYSTEM_ADMIN_CAPABILITY = 'platform:tenant:create';
const TENANT_ADMIN_CAPABILITIES = [
  'tenant:org_unit:create',
  'tenant:module_entitlement:manage',
  'tenant:role:assign',
  'tenant:org_unit_admin:assign',
];

export const useAccessStore = defineStore('access', () => {
  const roles = ref<string[]>([]);
  const capabilities = ref<string[]>([]);
  const moduleEntitlements = ref({
    connectshyft: false,
    moneyshyft: false,
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const capabilitySet = computed(() => new Set(capabilities.value));

  const canAccessSystemAdmin = computed(
    () => capabilitySet.value.has(SYSTEM_ADMIN_CAPABILITY)
  );

  const canAccessTenantAdmin = computed(() => {
    if (canAccessSystemAdmin.value) {
      return true;
    }

    return TENANT_ADMIN_CAPABILITIES.some((capability) => capabilitySet.value.has(capability));
  });

  const hasAnyAdminAccess = computed(
    () => canAccessSystemAdmin.value || canAccessTenantAdmin.value
  );

  const canAccessConnectShyft = computed(() => moduleEntitlements.value.connectshyft === true);
  const canAccessMoneyShyft = computed(() => moduleEntitlements.value.moneyshyft === true);

  const defaultAuthorizedPath = computed(() => {
    if (canAccessSystemAdmin.value) {
      return '/admin/system';
    }

    if (canAccessTenantAdmin.value) {
      return '/admin/tenant';
    }

    if (canAccessMoneyShyft.value) {
      return '/';
    }

    if (canAccessConnectShyft.value) {
      return '/app/connectshyft/inbox';
    }

    return '/budget/setup';
  });

  const hasCapability = (capability: string): boolean => capabilitySet.value.has(capability);
  const isModuleEnabled = (moduleKey: 'connectshyft' | 'moneyshyft'): boolean =>
    moduleEntitlements.value[moduleKey] === true;

  const refresh = async (params: {
    tenantId?: string | null;
    orgUnitId?: string | null;
  } = {}): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await evaluateRbac(params);
      roles.value = Array.isArray(data.roles) ? data.roles : [];
      capabilities.value = Array.isArray(data.capabilities) ? data.capabilities : [];
      moduleEntitlements.value = {
        connectshyft: data.moduleEntitlements?.connectshyft === true,
        moneyshyft: data.moduleEntitlements?.moneyshyft === true,
      };
    } catch (err: any) {
      roles.value = [];
      capabilities.value = [];
      moduleEntitlements.value = {
        connectshyft: false,
        moneyshyft: false,
      };
      error.value = err?.response?.data?.message || err?.message || 'Failed to load access capabilities';
    } finally {
      isLoading.value = false;
    }
  };

  const clear = (): void => {
    roles.value = [];
    capabilities.value = [];
    moduleEntitlements.value = {
      connectshyft: false,
      moneyshyft: false,
    };
    error.value = null;
  };

  return {
    roles,
    capabilities,
    moduleEntitlements,
    isLoading,
    error,
    canAccessSystemAdmin,
    canAccessTenantAdmin,
    canAccessConnectShyft,
    canAccessMoneyShyft,
    defaultAuthorizedPath,
    hasAnyAdminAccess,
    hasCapability,
    isModuleEnabled,
    refresh,
    clear,
  };
});
