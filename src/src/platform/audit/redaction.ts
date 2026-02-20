export const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEY_MARKERS = Object.freeze([
  'token',
  'secret',
  'password',
  'apikey',
  'authorization',
  'credential',
  'cookie',
  'session',
]);

type RedactionAccumulator = {
  redactedFields: Set<string>;
  redactedPaths: Set<string>;
  sensitiveMarkers: Set<string>;
};

export type RedactionResult<T> = {
  redactedPayload: T;
  redactedFields: string[];
  redactedPaths: string[];
  sensitiveMarkers: string[];
};

const normalizeKey = (value: string): string => value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const isSensitiveKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  if (!normalized) {
    return false;
  }

  return SENSITIVE_KEY_MARKERS.some((marker) => normalized.includes(marker));
};

const collectSensitiveMarkers = (value: unknown, markers: Set<string>): void => {
  if (typeof value === 'string') {
    if (value.length > 0) {
      markers.add(value);
    }
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    markers.add(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSensitiveMarkers(item, markers));
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectSensitiveMarkers(item, markers));
  }
};

const redactValue = (
  value: unknown,
  pathPrefix: string,
  accumulator: RedactionAccumulator,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, `${pathPrefix}[${index}]`, accumulator));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, current] of Object.entries(source)) {
    const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (isSensitiveKey(key)) {
      accumulator.redactedFields.add(key);
      accumulator.redactedPaths.add(nextPath);
      collectSensitiveMarkers(current, accumulator.sensitiveMarkers);
      output[key] = REDACTED_VALUE;
      continue;
    }

    output[key] = redactValue(current, nextPath, accumulator);
  }

  return output;
};

export const redactSensitivePayload = <T>(payload: T): RedactionResult<T> => {
  const accumulator: RedactionAccumulator = {
    redactedFields: new Set<string>(),
    redactedPaths: new Set<string>(),
    sensitiveMarkers: new Set<string>(),
  };

  const redactedPayload = redactValue(payload, '', accumulator) as T;

  return {
    redactedPayload,
    redactedFields: Array.from(accumulator.redactedFields).sort(),
    redactedPaths: Array.from(accumulator.redactedPaths).sort(),
    sensitiveMarkers: Array.from(accumulator.sensitiveMarkers).filter((value) => value.length > 0),
  };
};

export const containsPlaintextMarkers = (payload: unknown, markers: string[]): boolean => {
  if (markers.length === 0) {
    return false;
  }

  const serialized = JSON.stringify(payload);
  return markers.some((marker) => marker.length > 0 && serialized.includes(marker));
};
