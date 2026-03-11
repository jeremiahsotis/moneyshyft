// Starter entrypoint for phone identity logic.
// CS-002 should populate this module with the real implementation.

export type PhoneNormalizationContext = {
  defaultAreaCode?: string
  defaultCountry?: string
}

export function normalizePhone(_input: string, _context: PhoneNormalizationContext = {}) {
  throw new Error('normalizePhone not implemented yet')
}
