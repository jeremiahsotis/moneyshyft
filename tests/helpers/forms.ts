import type { Locator } from '@playwright/test';

export async function selectFirstNonEmptyOption(select: Locator): Promise<string> {
  const handle = await select.elementHandle();
  if (handle) {
    await select.page().waitForFunction((node) => {
      const options = Array.from((node as HTMLSelectElement).options);
      return options.some((opt) => opt.value && opt.value !== 'null');
    }, handle);
  }

  const value = await select.evaluate((node) => {
    const options = Array.from((node as HTMLSelectElement).options);
    const option = options.find((opt) => opt.value && opt.value !== 'null');
    return option ? option.value : '';
  });

  if (value) {
    await select.selectOption(value);
  }

  return value;
}

export async function selectDifferentOption(select: Locator, excludedValue: string): Promise<string> {
  const handle = await select.elementHandle();
  if (handle) {
    await select.page().waitForFunction((node, excluded) => {
      const options = Array.from((node as HTMLSelectElement).options);
      return options.some((opt) => opt.value && opt.value !== 'null' && opt.value !== excluded && !opt.disabled);
    }, handle, excludedValue);
  }

  const value = await select.evaluate((node, excluded) => {
    const options = Array.from((node as HTMLSelectElement).options);
    const option = options.find((opt) => opt.value && opt.value !== 'null' && opt.value !== excluded && !opt.disabled);
    return option ? option.value : '';
  }, excludedValue);

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
