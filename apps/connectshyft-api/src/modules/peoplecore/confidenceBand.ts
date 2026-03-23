import type {
  ContactPoint,
  IdentityConfidenceBand,
} from '@shyft/contracts';

export type ConfidenceBand = IdentityConfidenceBand;

const BAND_ORDER: ConfidenceBand[] = [
  'very_low',
  'low',
  'medium',
  'high',
  'very_high',
];

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
  let cappedBand = initial;

  const capBand = (maximumBand: ConfidenceBand): void => {
    if (BAND_ORDER.indexOf(cappedBand) > BAND_ORDER.indexOf(maximumBand)) {
      cappedBand = maximumBand;
    }
  };

  if (status === 'reassignment_suspected') {
    capBand('medium');
  }
  if (status === 'active_shared_confirmed') {
    capBand('high');
  }
  if (hasMultipleCurrentLinks) {
    capBand('high');
  }

  return cappedBand;
}
