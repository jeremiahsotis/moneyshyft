import type {
  ContactPoint,
  IdentityConfidenceBand,
} from '@shyft/contracts';

export type ConfidenceBand = IdentityConfidenceBand;

function mapScoreToBand(score: number): ConfidenceBand {
  if (!Number.isFinite(score)) {
    throw new Error('assignConfidenceBand requires a finite numeric score.');
  }
  if (score <= 0) {
    return 'very_low';
  }
  if (score <= 39) {
    return 'low';
  }
  if (score <= 79) {
    return 'medium';
  }
  if (score <= 119) {
    return 'high';
  }
  if (score >= 120) {
    return 'very_high';
  }

  throw new Error(`assignConfidenceBand could not map score ${score} to a confidence band.`);
}

export function assignConfidenceBand(
  score: number,
  status: ContactPoint['status'],
  hasMultipleCurrentLinks: boolean,
): ConfidenceBand {
  if (typeof status !== 'string' || status.length === 0) {
    throw new Error('assignConfidenceBand requires a ContactPoint status.');
  }
  if (typeof hasMultipleCurrentLinks !== 'boolean') {
    throw new Error('assignConfidenceBand requires hasMultipleCurrentLinks to be a boolean.');
  }

  const initial = mapScoreToBand(score);

  void initial;
  void hasMultipleCurrentLinks;

  throw new Error('assignConfidenceBand not implemented');
}
