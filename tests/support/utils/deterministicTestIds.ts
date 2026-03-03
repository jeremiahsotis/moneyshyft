import { createHash } from 'node:crypto';
import type { TestInfo } from '@playwright/test';

const DEFAULT_RUN_SEED = 'seed0000';
const DEFAULT_TIMESTAMP_BASE_SECONDS = Number(
  process.env.PLAYWRIGHT_TEST_TIMESTAMP_BASE ?? Math.trunc(Date.now() / 1000),
);

const toHash = (input: string): string =>
  createHash('sha1').update(input).digest('hex');

const runSeed = (): string =>
  process.env.PLAYWRIGHT_TEST_RUN_SEED ?? DEFAULT_RUN_SEED;

const buildSeed = (testInfo: TestInfo, label: string): string => {
  const titlePath = Array.isArray(testInfo.titlePath)
    ? testInfo.titlePath.join(' > ')
    : testInfo.title;
  const project = testInfo.project.name || 'default-project';
  return [
    runSeed(),
    project,
    titlePath,
    `retry:${testInfo.retry}`,
    `worker:${testInfo.workerIndex}`,
    label,
  ].join('|');
};

export const deterministicToken = (
  testInfo: TestInfo,
  label: string,
  length = 8,
): string => toHash(buildSeed(testInfo, label)).slice(0, length);

export const deterministicProviderEventId = (
  prefix: string,
  testInfo: TestInfo,
  label: string,
): string => `${prefix}-${deterministicToken(testInfo, label)}`;

export const deterministicDigits = (
  testInfo: TestInfo,
  label: string,
  digits = 7,
): string => {
  const token = deterministicToken(testInfo, label, 8);
  const max = 10 ** digits;
  const numeric = parseInt(token, 16) % max;
  return String(numeric).padStart(digits, '0');
};

export const deterministicE164 = (
  testInfo: TestInfo,
  label: string,
  prefix = '+1260',
): string => `${prefix}${deterministicDigits(testInfo, label, 7)}`;

export const deterministicUnixTimestamp = (
  testInfo: TestInfo,
  label: string,
  base = DEFAULT_TIMESTAMP_BASE_SECONDS,
  lookbackWindowSeconds = 240,
): string => {
  const token = deterministicToken(testInfo, label, 8);
  const window = Math.max(1, lookbackWindowSeconds);
  const secondsOffset = parseInt(token, 16) % window;
  return String(base - secondsOffset);
};
