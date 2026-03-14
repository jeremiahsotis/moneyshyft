import { evaluateRetryPolicy } from '../retryPolicy'

describe('communication retry policy', () => {
  it('returns retry for retryable failures below the attempt cap and exhausts when capped', () => {
    const retry = evaluateRetryPolicy({
      attemptNumber: 1,
      maxAttempts: 3,
      isRetryable: true,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      now: new Date('2026-03-12T12:00:00.000Z'),
    })

    const exhausted = evaluateRetryPolicy({
      attemptNumber: 3,
      maxAttempts: 3,
      isRetryable: true,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      now: new Date('2026-03-12T12:00:00.000Z'),
    })

    const doNotRetry = evaluateRetryPolicy({
      attemptNumber: 1,
      maxAttempts: 3,
      isRetryable: false,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      now: new Date('2026-03-12T12:00:00.000Z'),
    })

    expect(retry.decision).toBe('retry')
    expect(exhausted).toEqual({ decision: 'exhausted' })
    expect(doNotRetry).toEqual({ decision: 'do_not_retry' })
  })
})
