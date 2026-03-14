import type { StoryG2Context } from '../support/factories/connectShyftStoryG2Factory';

export const STORY_G2_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

type StoryG2SurfaceUrlOptions = {
  bucket: 'inbox' | 'mine';
  actorUserId: string;
  tenantRole: string;
  queueSearch?: string;
};

type StoryG2ThreadDetailUrlOptions = {
  threadId: string;
  actorUserId: string;
  tenantRole: string;
  queueSearch?: string;
};

const buildStoryG2UrlParams = (
  context: StoryG2Context,
  options: {
    actorUserId: string;
    tenantRole: string;
    queueSearch?: string;
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

  if (typeof options.queueSearch === 'string' && options.queueSearch.trim().length > 0) {
    params.set('queueSearch', options.queueSearch.trim());
  }

  return params.toString();
};

export const buildStoryG2SurfaceUrl = (
  context: StoryG2Context,
  options: StoryG2SurfaceUrlOptions,
): string => {
  const basePath = options.bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${basePath}?${buildStoryG2UrlParams(context, options)}`;
};

export const buildStoryG2ThreadDetailUrl = (
  context: StoryG2Context,
  options: StoryG2ThreadDetailUrlOptions,
): string => {
  return `${context.paths.threadDetailUi}/${options.threadId}?${buildStoryG2UrlParams(context, options)}`;
};
