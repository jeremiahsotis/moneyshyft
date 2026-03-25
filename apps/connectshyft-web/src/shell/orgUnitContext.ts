import { readonly, ref } from 'vue';
import type {
  ConnectShyftShellContext,
  ConnectShyftShellModuleAvailability,
  ConnectShyftShellOrgUnitOption,
} from '@shyft/contracts';
import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';
import { setActiveShellOrgUnitId } from './orgUnitState';

type ConnectShyftContextEnvelope = {
  ok?: boolean;
  message?: string;
  data?: {
    context?: unknown;
  };
};

const availableShellOrgUnits = ref<ConnectShyftShellOrgUnitOption[]>([]);
const shellOrgUnitLoading = ref(false);
const shellOrgUnitError = ref('');

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const parseShellModuleAvailability = (
  value: unknown,
): ConnectShyftShellModuleAvailability => {
  const candidate = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};

  return {
    people: candidate.people !== false,
    connect: candidate.connect === true,
    settings: candidate.settings === true,
  };
};

const parseShellOrgUnitOption = (value: unknown): ConnectShyftShellOrgUnitOption | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = normalizeString(candidate.id);
  const label = normalizeString(candidate.label);

  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    availableModules: parseShellModuleAvailability(candidate.availableModules),
  };
};

const parseShellContext = (value: unknown): ConnectShyftShellContext | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const tenantId = normalizeString(candidate.tenantId);
  const orgUnitId = normalizeString(candidate.orgUnitId);

  if (!tenantId || !orgUnitId) {
    return null;
  }

  const rawOrgUnits = Array.isArray(candidate.orgUnits) ? candidate.orgUnits : [];
  const orgUnits = rawOrgUnits
    .map((entry) => parseShellOrgUnitOption(entry))
    .filter((entry): entry is ConnectShyftShellOrgUnitOption => entry !== null);
  const normalizedOrgUnits = orgUnits.some((orgUnit) => orgUnit.id === orgUnitId)
    ? orgUnits
    : [
      {
        id: orgUnitId,
        label: 'Current org unit',
        availableModules: parseShellModuleAvailability(null),
      },
      ...orgUnits,
    ];

  const telephonyCandidate = candidate.telephony && typeof candidate.telephony === 'object'
    ? candidate.telephony as Record<string, unknown>
    : {};

  return {
    tenantId,
    orgUnitId,
    bypassedOrgUnitMembership: candidate.bypassedOrgUnitMembership === true,
    orgUnits: normalizedOrgUnits,
    telephony: {
      operatorPhoneSource: normalizeString(telephonyCandidate.operatorPhoneSource) || null,
      voiceReady: telephonyCandidate.voiceReady === true,
      smsReady: telephonyCandidate.smsReady === true,
      degradedMode: telephonyCandidate.degradedMode === true,
    },
  };
};

const extractContextFromEnvelope = (payload: unknown): ConnectShyftShellContext | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftContextEnvelope;
  return parseShellContext(envelope.data?.context);
};

const extractEnvelopeMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const envelope = payload as ConnectShyftContextEnvelope;
  return normalizeString(envelope.message) || fallback;
};

export const useShellAvailableOrgUnits = () => readonly(availableShellOrgUnits);

export const useShellOrgUnitLoading = () => readonly(shellOrgUnitLoading);

export const useShellOrgUnitError = () => readonly(shellOrgUnitError);

export const findShellOrgUnit = (orgUnitId: string): ConnectShyftShellOrgUnitOption | null => (
  availableShellOrgUnits.value.find((orgUnit) => orgUnit.id === orgUnitId) || null
);

export const applyShellContext = (context: ConnectShyftShellContext): void => {
  availableShellOrgUnits.value = context.orgUnits;
  shellOrgUnitError.value = '';
  setActiveShellOrgUnitId(context.orgUnitId);
};

export const selectShellOrgUnit = (orgUnitId: string): ConnectShyftShellOrgUnitOption | null => {
  const matchedOrgUnit = findShellOrgUnit(orgUnitId);
  if (!matchedOrgUnit) {
    return null;
  }

  setActiveShellOrgUnitId(matchedOrgUnit.id);
  return matchedOrgUnit;
};

export const loadShellOrgUnitContext = async (): Promise<ConnectShyftShellContext | null> => {
  shellOrgUnitLoading.value = true;

  try {
    const response = await api.get('/connectshyft/context', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    const context = extractContextFromEnvelope(response.data);
    if (!context) {
      shellOrgUnitError.value = extractEnvelopeMessage(
        response.data,
        'Unable to load org unit access.',
      );
      return null;
    }

    applyShellContext(context);
    return context;
  } catch (error: unknown) {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;
    shellOrgUnitError.value = extractEnvelopeMessage(
      responseData,
      'Unable to load org unit access.',
    );
    return null;
  } finally {
    shellOrgUnitLoading.value = false;
  }
};

export const resetShellOrgUnitContextForTests = (): void => {
  availableShellOrgUnits.value = [];
  shellOrgUnitLoading.value = false;
  shellOrgUnitError.value = '';
  setActiveShellOrgUnitId('');
};
