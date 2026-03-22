import { loadConnectShyftBridgeAggregateBySessionId } from './bridgeSessions';

type ConnectShyftCallSessionAggregate = NonNullable<
  Awaited<ReturnType<typeof loadConnectShyftBridgeAggregateBySessionId>>
>;

const loadConnectShyftCallSessionAggregate = async (
  sessionId: string,
): Promise<ConnectShyftCallSessionAggregate | null> => {
  const normalizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
  if (!normalizedSessionId) {
    return null;
  }

  return loadConnectShyftBridgeAggregateBySessionId(normalizedSessionId);
};

export const triggerVoicemailFallback = async (sessionId: string): Promise<void> => {
  const aggregate = await loadConnectShyftCallSessionAggregate(sessionId);
  if (!aggregate) {
    return;
  }

  // Checkpoint 1 only establishes the callable fallback entry point.
};

export const handleNeighborTimeout = async (sessionId: string): Promise<void> => {
  const aggregate = await loadConnectShyftCallSessionAggregate(sessionId);
  if (!aggregate) {
    return;
  }

  await triggerVoicemailFallback(aggregate.session.id);
};
