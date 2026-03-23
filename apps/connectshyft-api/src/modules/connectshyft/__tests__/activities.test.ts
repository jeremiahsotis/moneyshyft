import type { Person } from '@shyft/contracts';
import type { Request, Response } from 'express';
import type { Activity } from '../../peoplecore/activity';
import type { ConnectShyftThread } from '../threads';
import {
  ConnectShyftActivityForbiddenError,
  ConnectShyftActivityNotFoundError,
  ConnectShyftActivityPersistenceUnavailableError,
  ConnectShyftActivityService,
  ConnectShyftPersonNotFoundError,
  InMemoryConnectShyftActivityThreadStore,
  connectShyftActivityServiceAsync,
} from '../activities';
import { getActivityThreadsHandler } from '../handlers/getActivityThreadsHandler';
import { getPersonActivitiesHandler } from '../handlers/getPersonActivitiesHandler';
import { postPersonActivityHandler } from '../handlers/postPersonActivityHandler';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

type RequestOptions = {
  activityId?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  orgUnitId?: string;
  personId?: string;
  role?: string;
  tenantId?: string;
  userId?: string;
};

const BASE_ACTIVITY: Activity = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: 'tenant-connectshyft-activity',
  orgUnitId: 'org-connectshyft-activity-east',
  personId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  type: 'housing-intake',
  status: 'ACTIVE',
  createdAtUtc: '2026-03-23T12:00:00.000Z',
  updatedAtUtc: '2026-03-23T12:00:00.000Z',
};

const BASE_PERSON: Person = {
  id: BASE_ACTIVITY.personId,
  tenantId: BASE_ACTIVITY.tenantId,
  orgUnitId: BASE_ACTIVITY.orgUnitId,
  firstName: 'Activity',
  lastName: 'Person',
  preferredName: undefined,
  status: 'active_confirmed',
  mergedIntoPersonId: undefined,
  createdAt: '2026-03-23T11:00:00.000Z',
  updatedAt: '2026-03-23T11:00:00.000Z',
};

const BASE_THREAD: ConnectShyftThread = {
  threadId: '22222222-2222-4222-8222-222222222222',
  tenantId: BASE_ACTIVITY.tenantId,
  orgUnitId: BASE_ACTIVITY.orgUnitId,
  neighborId: 'neighbor-connectshyft-activity-1',
  personId: BASE_ACTIVITY.personId,
  activityId: BASE_ACTIVITY.id,
  source: 'VOICE',
  state: 'UNCLAIMED',
  lastInboundCsNumberId: 'cs-inbound-1',
  preferredOutboundCsNumberId: 'cs-outbound-1',
  claimedByUserId: null,
  claimedAtUtc: null,
  closedByUserId: null,
  closedAtUtc: null,
  createdAtUtc: '2026-03-23T13:00:00.000Z',
  updatedAtUtc: '2026-03-23T13:00:00.000Z',
  escalation: {
    stage: 0,
    nextEvaluationAtUtc: '2026-03-23T13:00:00.000Z',
  },
};

const createRequest = (options: RequestOptions = {}): Request => {
  const tenantId = options.tenantId ?? BASE_ACTIVITY.tenantId;
  const orgUnitId = options.orgUnitId ?? BASE_ACTIVITY.orgUnitId;
  const normalizedHeaders = Object.entries({
    'x-test-connectshyft-flags': JSON.stringify({
      connectshyft_enabled: true,
      connectshyft_inbox_enabled: true,
      connectshyft_escalation_enabled: true,
      connectshyft_webhooks_enabled: true,
    }),
    'x-test-connectshyft-orgunit-memberships': JSON.stringify([orgUnitId]),
    ...options.headers,
  }).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});

  return {
    body: options.body ?? {},
    params: {
      ...(options.personId ? { personId: options.personId } : {}),
      ...(options.activityId ? { activityId: options.activityId } : {}),
    },
    tenantId,
    orgUnitId,
    tenantContext: {
      tenantId,
      orgUnitId,
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    },
    user: {
      userId: options.userId ?? 'user-connectshyft-activity',
      email: 'activity-handler@example.com',
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId,
      role: options.role ?? 'ORGUNIT_MEMBER',
    },
    header: (name: string) => normalizedHeaders[name.toLowerCase()] || undefined,
  } as unknown as Request;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: {
      responseEnvelope: {
        correlationId: 'corr-connectshyft-activity-tests',
        tenantId: BASE_ACTIVITY.tenantId,
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe('connectshyft activity service', () => {
  let service: ConnectShyftActivityService;
  let peopleCoreService: {
    createActivity: jest.Mock;
    getActivity: jest.Mock;
    getPerson: jest.Mock;
    listActivities: jest.Mock;
  };

  beforeEach(() => {
    peopleCoreService = {
      createActivity: jest.fn(),
      getActivity: jest.fn(),
      getPerson: jest.fn(),
      listActivities: jest.fn(),
    };

    service = new ConnectShyftActivityService(
      peopleCoreService as any,
      new InMemoryConnectShyftActivityThreadStore([
        BASE_THREAD,
        {
          ...BASE_THREAD,
          threadId: '33333333-3333-4333-8333-333333333333',
          createdAtUtc: '2026-03-23T13:05:00.000Z',
          updatedAtUtc: '2026-03-23T13:05:00.000Z',
          activityId: BASE_ACTIVITY.id,
        },
        {
          ...BASE_THREAD,
          threadId: '44444444-4444-4444-8444-444444444444',
          activityId: '55555555-5555-4555-8555-555555555555',
        },
      ]),
    );
  });

  it('creates a person activity when the actor has activity create capability', async () => {
    peopleCoreService.getPerson.mockResolvedValue(BASE_PERSON);
    peopleCoreService.createActivity.mockResolvedValue(BASE_ACTIVITY);

    const activity = await service.createPersonActivity({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: BASE_ACTIVITY.tenantId,
      orgUnitId: BASE_ACTIVITY.orgUnitId,
      personId: BASE_ACTIVITY.personId,
      type: BASE_ACTIVITY.type,
    });

    expect(activity).toEqual(BASE_ACTIVITY);
    expect(peopleCoreService.createActivity).toHaveBeenCalledWith({
      tenantId: BASE_ACTIVITY.tenantId,
      orgUnitId: BASE_ACTIVITY.orgUnitId,
      personId: BASE_ACTIVITY.personId,
      type: BASE_ACTIVITY.type,
      status: undefined,
    });
  });

  it('throws CONNECTSHYFT_FORBIDDEN when the actor lacks activity create capability', async () => {
    await expect(service.createPersonActivity({
      actorRoles: ['TENANT_VIEWER'],
      tenantId: BASE_ACTIVITY.tenantId,
      orgUnitId: BASE_ACTIVITY.orgUnitId,
      personId: BASE_ACTIVITY.personId,
      type: BASE_ACTIVITY.type,
    })).rejects.toBeInstanceOf(ConnectShyftActivityForbiddenError);
  });

  it('throws CONNECTSHYFT_PERSON_NOT_FOUND when the person is outside the current orgUnit', async () => {
    peopleCoreService.getPerson.mockResolvedValue({
      ...BASE_PERSON,
      orgUnitId: 'org-connectshyft-activity-west',
    });

    await expect(service.listPersonActivities({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: BASE_ACTIVITY.tenantId,
      orgUnitId: BASE_ACTIVITY.orgUnitId,
      personId: BASE_ACTIVITY.personId,
    })).rejects.toBeInstanceOf(ConnectShyftPersonNotFoundError);
  });

  it('lists only threads bound to the requested activity', async () => {
    peopleCoreService.getActivity.mockResolvedValue(BASE_ACTIVITY);

    const threads = await service.listActivityThreads({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: BASE_ACTIVITY.tenantId,
      orgUnitId: BASE_ACTIVITY.orgUnitId,
      activityId: BASE_ACTIVITY.id,
    });

    expect(threads.map((thread) => thread.threadId)).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ]);
  });

  it('throws CONNECTSHYFT_ACTIVITY_NOT_FOUND when the activity does not exist', async () => {
    peopleCoreService.getActivity.mockResolvedValue(null);

    await expect(service.listActivityThreads({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: BASE_ACTIVITY.tenantId,
      orgUnitId: BASE_ACTIVITY.orgUnitId,
      activityId: BASE_ACTIVITY.id,
    })).rejects.toBeInstanceOf(ConnectShyftActivityNotFoundError);
  });
});

describe('connectshyft activity handlers', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
  });

  it('returns a 201 success envelope when creating a person activity', async () => {
    jest.spyOn(connectShyftActivityServiceAsync, 'createPersonActivity').mockResolvedValue(BASE_ACTIVITY);
    const res = createMockResponse();

    await postPersonActivityHandler(createRequest({
      personId: BASE_ACTIVITY.personId,
      body: {
        type: BASE_ACTIVITY.type,
      },
    }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      code: 'CONNECTSHYFT_ACTIVITY_CREATED',
      data: {
        activity: BASE_ACTIVITY,
      },
    }));
  });

  it('returns a client refusal when personId is not a UUID', async () => {
    const createSpy = jest.spyOn(connectShyftActivityServiceAsync, 'createPersonActivity');
    const res = createMockResponse();

    await postPersonActivityHandler(createRequest({
      personId: 'not-a-uuid',
      body: {
        type: BASE_ACTIVITY.type,
      },
    }), res);

    expect(createSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_PERSON_ID_INVALID',
      refusalType: 'client',
    }));
  });

  it('maps person not found to a 404 refusal envelope', async () => {
    jest
      .spyOn(connectShyftActivityServiceAsync, 'listPersonActivities')
      .mockRejectedValue(new ConnectShyftPersonNotFoundError());
    const res = createMockResponse();

    await getPersonActivitiesHandler(createRequest({
      personId: BASE_ACTIVITY.personId,
    }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_PERSON_NOT_FOUND',
    }));
  });

  it('maps persistence failures to a 503 system envelope', async () => {
    jest
      .spyOn(connectShyftActivityServiceAsync, 'listActivityThreads')
      .mockRejectedValue(new ConnectShyftActivityPersistenceUnavailableError());
    const res = createMockResponse();

    await getActivityThreadsHandler(createRequest({
      activityId: BASE_ACTIVITY.id,
    }), res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_ACTIVITY_PERSISTENCE_UNAVAILABLE',
      errorType: 'system',
    }));
  });
});
