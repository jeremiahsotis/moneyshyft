import {
  InMemoryIntakeRequestRepository,
  KnexIntakeRequestRepository,
} from '../intakeRequestRepository';

describe('route intake request repository', () => {
  it('enforces tenant + orgUnit scope for in-memory detail lookups', async () => {
    const repository = new InMemoryIntakeRequestRepository();
    const created = await repository.createAccepted({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      channel: 'cashier',
      requestedAtUtc: '2026-02-26T14:00:00.000Z',
      requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
      requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
      scheduleMode: 'pickup',
      notes: 'scope test',
      commitmentId: 'commitment-1',
      createdByUserId: 'user-1',
    });

    const sameScope = await repository.getById('tenant-1', 'org-1', created.requestId);
    const crossOrgUnit = await repository.getById('tenant-1', 'org-2', created.requestId);

    expect(sameScope).toBeTruthy();
    expect(crossOrgUnit).toBeNull();
  });

  it('queries knex detail lookups using tenant + orgUnit scope', async () => {
    const where = jest.fn();
    const first = jest.fn();

    where.mockReturnValue({ first });
    first.mockResolvedValue({
      id: 'request-1',
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      channel: 'cashier',
      requested_at_utc: '2026-02-26T14:00:00.000Z',
      requested_window_start_utc: '2026-02-27T14:00:00.000Z',
      requested_window_end_utc: '2026-02-27T16:00:00.000Z',
      schedule_mode: 'pickup',
      notes: 'scope test',
      status: 'Accepted',
      commitment_id: 'commitment-1',
      refusal_reason_code: null,
      refusal_message: null,
      refusal_alternatives: null,
      refusal_next_steps: null,
      created_by_user_id: 'user-1',
      created_at_utc: '2026-02-26T14:00:00.000Z',
      updated_at_utc: '2026-02-26T14:00:00.000Z',
    });

    const knexClient = {
      withSchema: jest.fn().mockReturnValue({
        table: jest.fn().mockReturnValue({ where }),
      }),
    };

    const repository = new KnexIntakeRequestRepository(knexClient as never);
    const record = await repository.getById('tenant-1', 'org-1', 'request-1');

    expect(where).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      id: 'request-1',
    });
    expect(record).toMatchObject({
      requestId: 'request-1',
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      scheduleMode: 'pickup',
      status: 'Accepted',
    });
  });
});
