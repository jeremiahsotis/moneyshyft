import type { Locator, Page } from '@playwright/test';
import type { StoryG1Context } from '../support/factories/connectShyftStoryG1Factory';

export const STORY_G1_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

type StoryG1SurfaceUrlOptions = {
  bucket: 'inbox' | 'mine';
  actorUserId: string;
  tenantRole: string;
};

type StoryG1ThreadDetailUrlOptions = {
  threadId: string;
  actorUserId: string;
  tenantRole: string;
};

const buildStoryG1UrlParams = (
  context: StoryG1Context,
  options: {
    actorUserId: string;
    tenantRole: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: context.orgUnitId,
  });

  return params.toString();
};

export const buildStoryG1SurfaceUrl = (
  context: StoryG1Context,
  options: StoryG1SurfaceUrlOptions,
): string => {
  const basePath = options.bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${basePath}?${buildStoryG1UrlParams(context, options)}`;
};

export const buildStoryG1ThreadDetailUrl = (
  context: StoryG1Context,
  options: StoryG1ThreadDetailUrlOptions,
): string => {
  return `${context.paths.threadDetailUi}/${options.threadId}?${buildStoryG1UrlParams(context, options)}`;
};

export const readCssVariable = async (page: Page, variableName: string): Promise<string> =>
  page.evaluate(
    (name) => window.getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    variableName,
  );

export const readPixelMetric = async (
  locator: Locator,
  property: 'fontSize' | 'minHeight' | 'gap',
): Promise<number> =>
  locator.evaluate(
    (element, requestedProperty) =>
      Number.parseFloat(window.getComputedStyle(element)[requestedProperty] || '0'),
    property,
  );

export const readStyleAttr = async (locator: Locator): Promise<string> =>
  (await locator.getAttribute('style')) ?? '';

export const readFontSizePx = async (locator: Locator): Promise<number> =>
  locator.evaluate((element) => Number.parseFloat(window.getComputedStyle(element).fontSize || '0'));

export const readMinHeightPx = async (locator: Locator): Promise<number> =>
  locator.evaluate((element) => Number.parseFloat(window.getComputedStyle(element).minHeight || '0'));

export const parseCssSizeToPx = (value: string): number => {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('rem')) {
    return Number.parseFloat(normalized) * 16;
  }

  return Number.parseFloat(normalized);
};
