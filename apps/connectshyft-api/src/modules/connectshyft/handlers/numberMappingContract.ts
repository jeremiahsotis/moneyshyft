export const normalizeConnectShyftNumberMappingContract = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeConnectShyftNumberMappingContract(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const normalizedEntry = normalizeConnectShyftNumberMappingContract(entry);
    if (key === 'twilioNumberE164') {
      normalized.twilioNumberE164 = normalizedEntry;
      normalized.providerNumberE164 = normalizedEntry;
      return;
    }

    if (key === 'providerNumberE164') {
      normalized.providerNumberE164 = normalizedEntry;
      normalized.twilioNumberE164 = normalizedEntry;
      return;
    }

    if (key === 'field' && normalizedEntry === 'twilioNumberE164') {
      normalized[key] = 'twilioNumberE164';
      normalized.providerField = 'providerNumberE164';
      return;
    }

    normalized[key] = normalizedEntry;
  });

  return normalized;
};
