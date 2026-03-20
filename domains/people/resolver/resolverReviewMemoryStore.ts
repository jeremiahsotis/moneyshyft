import type { ResolverReview } from '../../../libs/contracts/src/people'

export type CreateResolverReviewInput = Omit<ResolverReview, 'id'>

const resolverReviews: ResolverReview[] = []

let resolverReviewSequence = 0

export function listResolverReviews(): ResolverReview[] {
  return resolverReviews.map((resolverReview) => ({ ...resolverReview }))
}

export function createResolverReview(input: CreateResolverReviewInput): ResolverReview {
  const resolverReview: ResolverReview = {
    ...input,
    id: `rr_${++resolverReviewSequence}`,
  }

  resolverReviews.push(resolverReview)

  return { ...resolverReview }
}
