export type IdentityConfidenceBand = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

export const IDENTITY_CONFIDENCE_BANDS = [
  'very_low',
  'low',
  'medium',
  'high',
  'very_high',
] as const satisfies readonly IdentityConfidenceBand[]

export function scoreToConfidenceBand(score: number): IdentityConfidenceBand {
  if (score <= 0) {
    return 'very_low'
  }

  if (score < 40) {
    return 'low'
  }

  if (score < 80) {
    return 'medium'
  }

  if (score < 120) {
    return 'high'
  }

  return 'very_high'
}
