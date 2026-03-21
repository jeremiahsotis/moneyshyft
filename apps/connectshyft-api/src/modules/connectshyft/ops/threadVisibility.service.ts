import { AsyncConnectShyftThreadService, type ConnectShyftThread } from '../threads';

export type ConnectShyftThreadVisibility = {
  threadId: string;
  found: true;
  thread: ConnectShyftThread;
};

const defaultThreadService = new AsyncConnectShyftThreadService();

export const readConnectShyftThreadVisibility = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  allowCrossOrgUnit?: boolean;
}): Promise<ConnectShyftThreadVisibility | null> => {
  const thread = await defaultThreadService.findThreadById({
    tenantId: input.tenantId,
    threadId: input.threadId,
  });
  if (!thread) {
    return null;
  }

  if (input.allowCrossOrgUnit !== true && thread.orgUnitId !== input.orgUnitId) {
    return null;
  }

  return {
    threadId: thread.threadId,
    found: true,
    thread,
  };
};
