import { randomUUID } from 'node:crypto';

let connectShyftTestPhoneCounter = 0;

const normalizeSeriesDigit = (seriesDigit: string): string =>
  /^[2-9]$/.test(seriesDigit) ? seriesDigit : '9';

const nextPhoneSeed = (): string => {
  connectShyftTestPhoneCounter += 1;
  const uuidDigits = randomUUID().replace(/\D/g, '');
  return `${process.pid}${Date.now()}${connectShyftTestPhoneCounter}${uuidDigits}`
    .slice(-6)
    .padStart(6, '0');
};

export const createUniqueConnectShyftTestPhone = (
  seriesDigit: string,
): {
  raw: string;
  normalized: string;
} => {
  const seed = nextPhoneSeed();
  const exchange = `${normalizeSeriesDigit(seriesDigit)}${seed.slice(0, 2)}`;
  const line = seed.slice(2, 6);

  return {
    raw: `+1 (260) ${exchange}-${line}`,
    normalized: `+1260${exchange}${line}`,
  };
};
