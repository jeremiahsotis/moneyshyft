type SurfaceContext = {
  paths: {
    inboxUi: string;
    mineUi: string;
    threadDetailUi: string;
  };
  tenantId: string;
  orgUnitId: string;
  userId: string;
};

export const buildSurfaceUrl = (
  context: SurfaceContext,
  bucket: 'mine' | 'inbox',
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
    bucket,
  });

  const path = bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${path}?${params.toString()}`;
};

export const buildThreadDetailUrl = (
  context: SurfaceContext,
  threadId: string,
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.threadDetailUi}/${threadId}?${params.toString()}`;
};
