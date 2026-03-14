export type RetryPolicyDecision =
  | { decision: 'retry'; nextAttemptAt: Date }
  | { decision: 'exhausted' }
  | { decision: 'do_not_retry' }

export function evaluateRetryPolicy(input: {
  attemptNumber: number
  maxAttempts: number
  isRetryable: boolean
  baseDelayMs: number
  maxDelayMs: number
  now?: Date
}): RetryPolicyDecision {
  if (!input.isRetryable) return { decision: 'do_not_retry' }
  if (input.attemptNumber >= input.maxAttempts) return { decision: 'exhausted' }
  const now = input.now ?? new Date()
  const exponentialDelay = input.baseDelayMs * Math.pow(2, Math.max(input.attemptNumber - 1, 0))
  const boundedDelay = Math.min(exponentialDelay, input.maxDelayMs)
  const jitter = Math.floor(Math.random() * Math.max(Math.floor(boundedDelay * 0.2), 1))
  return { decision: 'retry', nextAttemptAt: new Date(now.getTime() + boundedDelay + jitter) }
}
