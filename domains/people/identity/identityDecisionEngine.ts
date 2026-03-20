import type { IdentityConfidenceBand } from '../../../libs/contracts/src/people'
import { scoreToConfidenceBand } from './confidenceBands'

export type IdentityCandidateInput = {
  personId: string
  score: number
  reasons: string[]
}

export type IdentityDecisionType =
  | 'create_new_default'
  | 'suggest_attach'
  | 'require_confirmation'
  | 'require_override'

export type IdentityDecisionOutput = {
  confidenceBand: IdentityConfidenceBand
  decisionType: IdentityDecisionType
  candidates: IdentityCandidateInput[]
}

const DECISION_TYPE_BY_BAND: Record<IdentityConfidenceBand, IdentityDecisionType> = {
  very_low: 'create_new_default',
  low: 'suggest_attach',
  medium: 'require_confirmation',
  high: 'suggest_attach',
  very_high: 'require_override',
}

export function decideIdentity(candidates: IdentityCandidateInput[]): IdentityDecisionOutput {
  const sortedCandidates = [...candidates].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.personId.localeCompare(right.personId)
  })

  const confidenceBand = scoreToConfidenceBand(sortedCandidates[0]?.score ?? 0)

  return {
    confidenceBand,
    decisionType: DECISION_TYPE_BY_BAND[confidenceBand],
    candidates: sortedCandidates,
  }
}
