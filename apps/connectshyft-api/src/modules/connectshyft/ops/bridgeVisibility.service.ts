import { loadConnectShyftBridgeAggregateBySessionId } from '../bridgeSessions';

type ConnectShyftBridgeRuntimeAggregate = NonNullable<
  Awaited<ReturnType<typeof loadConnectShyftBridgeAggregateBySessionId>>
>;

type ConnectShyftBridgeRuntimeStatus =
  ConnectShyftBridgeRuntimeAggregate['session']['status'];

export type ConnectShyftBridgeVisibility = {
  bridgeId: string;
  status: 'initiated' | 'ringing' | 'connected' | 'failed' | 'ended';
  operatorLeg: {
    phone: string;
    status: string;
  };
  neighborLeg: {
    phone: string;
    status: string;
  };
  provider: 'telnyx';
  lastEventAt: string;
};

const mapBridgeStatus = (
  status: ConnectShyftBridgeRuntimeStatus,
): ConnectShyftBridgeVisibility['status'] => {
  if (status === 'bridged') {
    return 'connected';
  }

  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'completed' || status === 'canceled' || status === 'expired') {
    return 'ended';
  }

  if (
    status === 'operator_dialing'
    || status === 'operator_answered'
    || status === 'neighbor_dialing'
    || status === 'neighbor_answered'
  ) {
    return 'ringing';
  }

  return 'initiated';
};

const resolveLastEventAt = (
  aggregate: ConnectShyftBridgeRuntimeAggregate,
): string => {
  const timestamps = [
    aggregate.session.completedAt,
    aggregate.session.updatedAt,
    aggregate.session.createdAt,
    aggregate.operatorLeg.endedAt,
    aggregate.operatorLeg.answeredAt,
    aggregate.operatorLeg.startedAt,
    aggregate.operatorLeg.updatedAt,
    aggregate.operatorLeg.createdAt,
    aggregate.neighborLeg.endedAt,
    aggregate.neighborLeg.answeredAt,
    aggregate.neighborLeg.startedAt,
    aggregate.neighborLeg.updatedAt,
    aggregate.neighborLeg.createdAt,
  ]
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime());

  return (timestamps[0] || aggregate.session.updatedAt).toISOString();
};

export const readConnectShyftBridgeVisibility = async (input: {
  tenantId: string;
  orgUnitId: string;
  bridgeId: string;
  allowCrossOrgUnit?: boolean;
}): Promise<ConnectShyftBridgeVisibility | null> => {
  const aggregate = await loadConnectShyftBridgeAggregateBySessionId(input.bridgeId);
  if (!aggregate || aggregate.session.tenantId !== input.tenantId) {
    return null;
  }

  if (input.allowCrossOrgUnit !== true && aggregate.session.orgUnitId !== input.orgUnitId) {
    return null;
  }

  return {
    bridgeId: aggregate.session.id,
    status: mapBridgeStatus(aggregate.session.status),
    operatorLeg: {
      phone: aggregate.session.operatorContactPointId,
      status: aggregate.operatorLeg.status,
    },
    neighborLeg: {
      phone: aggregate.session.neighborContactPointId,
      status: aggregate.neighborLeg.status,
    },
    provider: 'telnyx',
    lastEventAt: resolveLastEventAt(aggregate),
  };
};
