import { KnexCommitmentRepository } from '../commitmentRepository';

describe('knex route commitment repository', () => {
  it('writes status update and transition audit in one transaction', async () => {
    const updatedCommitment = {
      id: 'commitment-1',
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      status: 'in_progress',
      source_type: 'route_request',
      source_id: 'request-1',
      external_ref: null,
      created_by_user_id: 'user-1',
      updated_by_user_id: 'user-2',
      created_at_utc: '2026-02-24T10:00:00.000Z',
      updated_at_utc: '2026-02-24T10:05:00.000Z',
      terminal_at_utc: null,
      terminal_reason: null,
    };

    const insertedAudit = {
      id: 'audit-1',
      tenant_id: 'tenant-1',
      commitment_id: 'commitment-1',
      actor_id: 'user-2',
      reason: 'Dispatch started',
      previous_status: 'scheduled',
      new_status: 'in_progress',
      policy_exception_code: null,
      occurred_at_utc: '2026-02-24T10:05:00.000Z',
    };

    const commitmentTable = {
      where: jest.fn(),
      update: jest.fn(),
      returning: jest.fn(),
      first: jest.fn(),
    };
    commitmentTable.where.mockReturnValue(commitmentTable);
    commitmentTable.update.mockReturnValue(commitmentTable);
    commitmentTable.returning.mockResolvedValue([updatedCommitment]);

    const auditTable = {
      insert: jest.fn(),
      returning: jest.fn(),
    };
    auditTable.insert.mockReturnValue(auditTable);
    auditTable.returning.mockResolvedValue([insertedAudit]);

    const trx = {
      withSchema: jest.fn().mockImplementation((_schema: string) => ({
        table: (tableName: string) => {
          if (tableName === 'commitments') {
            return commitmentTable;
          }

          if (tableName === 'commitment_transition_audit') {
            return auditTable;
          }

          throw new Error(`Unexpected table: ${tableName}`);
        },
      })),
      fn: {
        now: jest.fn(() => 'NOW()'),
      },
    };

    const knexClient = {
      transaction: jest.fn(async (callback: (transaction: any) => Promise<unknown>) => callback(trx)),
    } as any;

    const repository = new KnexCommitmentRepository(knexClient);

    const result = await repository.transitionCommitment({
      tenantId: 'tenant-1',
      commitmentId: 'commitment-1',
      actorId: 'user-2',
      reason: 'Dispatch started',
      previousStatus: 'scheduled',
      newStatus: 'in_progress',
      policyExceptionCode: null,
    });

    expect(knexClient.transaction).toHaveBeenCalledTimes(1);
    expect(commitmentTable.where).toHaveBeenCalledWith({
      id: 'commitment-1',
      tenant_id: 'tenant-1',
      status: 'scheduled',
    });
    expect(commitmentTable.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in_progress',
      updated_by_user_id: 'user-2',
    }));
    expect(auditTable.insert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-1',
      commitment_id: 'commitment-1',
      actor_id: 'user-2',
      reason: 'Dispatch started',
      previous_status: 'scheduled',
      new_status: 'in_progress',
      policy_exception_code: null,
    }));
    expect(result).toMatchObject({
      ok: true,
      commitment: {
        commitmentId: 'commitment-1',
        status: 'in_progress',
      },
      transitionAudit: {
        transitionAuditId: 'audit-1',
        previousStatus: 'scheduled',
        newStatus: 'in_progress',
      },
    });
  });
});
