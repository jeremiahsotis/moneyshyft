import type { Request } from 'express';
import {
  formatUtcTimestampForTimezone,
  isStrictUtcIsoTimestamp,
  isValidIanaTimezone,
  resolveTimezoneContext,
  type TimezoneContext,
} from '../../../platform/time/timezoneService';

export type RouteTimezoneContext = TimezoneContext;

const DEFAULT_SYSTEM_TIMEZONE = 'UTC';
const UTC_FIELD_SUFFIX = /Utc$/;
const UTC_REDACTED_VALUE = '[UTC timestamp withheld]';
const EMBEDDED_UTC_ISO_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g;
const SYSTEM_TIMEZONE_ENV_KEYS = ['MONEYSHYFT_SYSTEM_TIMEZONE', 'SYSTEM_TIMEZONE', 'TZ'] as const;

const normalizeNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const resolveSystemTimezone = (): string => {
  for (const envKey of SYSTEM_TIMEZONE_ENV_KEYS) {
    const candidate = normalizeNonEmptyString(process.env[envKey]);
    if (candidate && isValidIanaTimezone(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_SYSTEM_TIMEZONE;
};

const localizeUtcString = (value: string, timezone: string): string => {
  const localized = formatUtcTimestampForTimezone(value, timezone);
  return localized || UTC_REDACTED_VALUE;
};

const localizeEmbeddedUtcTokens = (value: string, timezone: string): string => {
  if (!EMBEDDED_UTC_ISO_PATTERN.test(value)) {
    return value;
  }

  EMBEDDED_UTC_ISO_PATTERN.lastIndex = 0;
  return value.replace(EMBEDDED_UTC_ISO_PATTERN, (candidate) => {
    if (!isStrictUtcIsoTimestamp(candidate)) {
      return candidate;
    }

    return localizeUtcString(candidate, timezone);
  });
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const localizeValue = (value: unknown, context: RouteTimezoneContext): unknown => {
  if (typeof value === 'string') {
    if (isStrictUtcIsoTimestamp(value)) {
      return localizeUtcString(value, context.timezone);
    }

    return localizeEmbeddedUtcTokens(value, context.timezone);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => localizeValue(entry, context));
  }

  if (isPlainObject(value)) {
    const localized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      const localizedEntry = localizeValue(entry, context);
      if (UTC_FIELD_SUFFIX.test(key)) {
        localized[key.replace(UTC_FIELD_SUFFIX, 'Local')] = localizedEntry;
        continue;
      }

      localized[key] = localizedEntry;
    }

    return localized;
  }

  return value;
};

export const resolveRouteTimezoneContext = (req: Request): RouteTimezoneContext => {
  const resolved = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: resolveSystemTimezone(),
  });

  if (resolved) {
    return resolved;
  }

  return {
    timezone: DEFAULT_SYSTEM_TIMEZONE,
    timezoneSource: 'system',
  };
};

export const localizeRouteOperationalData = (
  data: unknown,
  context: RouteTimezoneContext,
): Record<string, unknown> => {
  const localized = localizeValue(data, context);
  if (!isPlainObject(localized)) {
    return {
      value: localized,
      timezone: context.timezone,
      timezoneSource: context.timezoneSource,
    };
  }

  return {
    ...localized,
    timezone: context.timezone,
    timezoneSource: context.timezoneSource,
  };
};
