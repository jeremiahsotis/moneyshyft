import {
  formatUtcTimestampForTimezone,
  isValidIanaTimezone,
  isStrictUtcIsoTimestamp,
  resolveTimezoneContext
} from '../timezoneService';

describe('timezoneService', () => {
  describe('resolveTimezoneContext', () => {
    it('uses user timezone when valid', () => {
      const result = resolveTimezoneContext({
        userTimezone: 'America/New_York',
        tenantTimezone: 'America/Chicago',
        systemTimezone: 'UTC'
      });

      expect(result).toEqual({
        timezone: 'America/New_York',
        timezoneSource: 'user'
      });
    });

    it('falls back to tenant then system when needed', () => {
      const tenantFallback = resolveTimezoneContext({
        userTimezone: 'Invalid/TZ',
        tenantTimezone: 'America/Chicago',
        systemTimezone: 'UTC'
      });

      const systemFallback = resolveTimezoneContext({
        userTimezone: '',
        tenantTimezone: '',
        systemTimezone: 'UTC'
      });

      expect(tenantFallback).toEqual({
        timezone: 'America/Chicago',
        timezoneSource: 'tenant'
      });
      expect(systemFallback).toEqual({
        timezone: 'UTC',
        timezoneSource: 'system'
      });
    });

    it('returns null when no valid timezone exists', () => {
      const result = resolveTimezoneContext({
        userTimezone: '',
        tenantTimezone: 'also-invalid',
        systemTimezone: ''
      });

      expect(result).toBeNull();
    });
  });

  describe('isValidIanaTimezone', () => {
    it('validates IANA zone identifiers', () => {
      expect(isValidIanaTimezone('America/Chicago')).toBe(true);
      expect(isValidIanaTimezone('UTC')).toBe(true);
      expect(isValidIanaTimezone('Bad/Timezone')).toBe(false);
    });
  });

  describe('isStrictUtcIsoTimestamp', () => {
    it('accepts strict UTC ISO-8601 timestamps', () => {
      expect(isStrictUtcIsoTimestamp('2026-02-17T15:30:00.000Z')).toBe(true);
      expect(isStrictUtcIsoTimestamp('2026-02-17T15:30:00Z')).toBe(true);
    });

    it('rejects non-UTC or malformed timestamps', () => {
      expect(isStrictUtcIsoTimestamp('2026-02-17T15:30:00-05:00')).toBe(false);
      expect(isStrictUtcIsoTimestamp('2026-02-17T15:30:00')).toBe(false);
      expect(isStrictUtcIsoTimestamp('2026-02-31T15:30:00Z')).toBe(false);
    });
  });

  describe('formatUtcTimestampForTimezone', () => {
    it('formats UTC timestamp into local display string', () => {
      const rendered = formatUtcTimestampForTimezone('2026-02-17T15:30:00.000Z', 'America/New_York');

      expect(rendered).toEqual(expect.any(String));
      expect(rendered).not.toContain('2026-02-17T15:30:00.000Z');
    });

    it('returns null for invalid UTC inputs', () => {
      const rendered = formatUtcTimestampForTimezone('invalid-ts', 'America/New_York');
      expect(rendered).toBeNull();
    });

    it('returns null for non-UTC timestamp offsets', () => {
      const rendered = formatUtcTimestampForTimezone('2026-02-17T15:30:00-05:00', 'America/New_York');
      expect(rendered).toBeNull();
    });
  });
});
