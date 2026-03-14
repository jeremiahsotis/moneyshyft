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

const UTC_ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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

export const isStrictUtcIsoTimestamp = (timestamp: string): boolean => {
  if (!UTC_ISO_8601_PATTERN.test(timestamp)) {
    return false;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const normalizedInput = timestamp.includes('.') ? timestamp : timestamp.replace('Z', '.000Z');
  return parsed.toISOString() === normalizedInput;
};

export const formatUtcTimestampForTimezone = (
  utcTimestamp: string,
  timezone: string
): string | null => {
  if (!isStrictUtcIsoTimestamp(utcTimestamp) || !isValidIanaTimezone(timezone)) {
    return null;
  }

  const parsed = new Date(utcTimestamp);
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(parsed);
  } catch (_error) {
    return null;
  }
};
