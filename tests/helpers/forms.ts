import type { Locator } from '@playwright/test';

const SELECT_OPTION_TIMEOUT_MS = 45_000;
const SELECT_OPTION_POLL_INTERVAL_MS = 250;

const resolveSelectableOptionValue = async (
  select: Locator,
  excludedValue?: string,
): Promise<string> =>
  select
    .evaluate((node, excluded) => {
      const options = Array.from((node as HTMLSelectElement).options);
      const option = options.find((opt) => {
        if (!opt.value || opt.value === 'null' || opt.disabled) {
          return false;
        }
        return !excluded || opt.value !== excluded;
      });
      return option ? option.value : '';
    }, excludedValue ?? '')
    .catch(() => '');

const waitForSelectableOptionValue = async (
  select: Locator,
  excludedValue?: string,
): Promise<string> => {
  await select.waitFor({ state: 'visible', timeout: SELECT_OPTION_TIMEOUT_MS });

  const deadline = Date.now() + SELECT_OPTION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const value = await resolveSelectableOptionValue(select, excludedValue);
    if (value) {
      return value;
    }
    await select.page().waitForTimeout(SELECT_OPTION_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for selectable option after ${SELECT_OPTION_TIMEOUT_MS}ms`);
};

export async function selectFirstNonEmptyOption(select: Locator): Promise<string> {
  const value = await waitForSelectableOptionValue(select);

  if (value) {
    await select.selectOption(value);
  }

  return value;
}

export async function selectDifferentOption(select: Locator, excludedValue: string): Promise<string> {
  const value = await waitForSelectableOptionValue(select, excludedValue);

  if (value) {
    await select.selectOption(value);
  }

  return value;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysFromTodayISO(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}
