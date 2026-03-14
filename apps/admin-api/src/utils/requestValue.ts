export const readString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === 'string');
  }

  return undefined;
};

export const readTrimmedString = (value: unknown): string | undefined => {
  const resolved = readString(value)?.trim();
  return resolved ? resolved : undefined;
};

export const readInteger = (value: unknown): number | undefined => {
  const resolved = readTrimmedString(value);
  if (!resolved) {
    return undefined;
  }

  const parsed = Number.parseInt(resolved, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const readNumber = (value: unknown): number | undefined => {
  const resolved = readTrimmedString(value);
  if (!resolved) {
    return undefined;
  }

  const parsed = Number.parseFloat(resolved);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const readDate = (value: unknown): Date | undefined => {
  const resolved = readTrimmedString(value);
  if (!resolved) {
    return undefined;
  }

  const parsed = new Date(resolved);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const readOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined => {
  const resolved = readTrimmedString(value);
  return resolved && allowed.includes(resolved as T) ? (resolved as T) : undefined;
};
