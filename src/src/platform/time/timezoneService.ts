export type TimezoneSource = 'user' | 'tenant' | 'system';

export type TimezoneContext = {
  timezone: string;
  timezoneSource: TimezoneSource;
};

type ResolveTimezoneInput = {
  userTimezone?: unknown;
  tenantTimezone?: unknown;
  systemTimezone?: unknown;
};

const normalizeTimezone = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const isValidIanaTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch (_error) {
    return false;
  }
};

export const resolveTimezoneContext = (input: ResolveTimezoneInput): TimezoneContext | null => {
  const candidates: Array<{ timezone: string | null; timezoneSource: TimezoneSource }> = [
    { timezone: normalizeTimezone(input.userTimezone), timezoneSource: 'user' },
    { timezone: normalizeTimezone(input.tenantTimezone), timezoneSource: 'tenant' },
    { timezone: normalizeTimezone(input.systemTimezone), timezoneSource: 'system' }
  ];

  for (const candidate of candidates) {
    if (candidate.timezone && isValidIanaTimezone(candidate.timezone)) {
      return {
        timezone: candidate.timezone,
        timezoneSource: candidate.timezoneSource
      };
    }
  }

  return null;
};

export const formatUtcTimestampForTimezone = (
  utcTimestamp: string,
  timezone: string
): string | null => {
  const parsed = new Date(utcTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(parsed);
};
