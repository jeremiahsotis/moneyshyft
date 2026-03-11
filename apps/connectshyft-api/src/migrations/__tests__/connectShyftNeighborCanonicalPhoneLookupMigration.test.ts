import {
  down,
  up,
} from '../20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index migration', () => {
  it('creates the canonical normalized_e164 lookup index', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('connectshyft_cs_neighbor_phones_tenant_normalized_e164_idx');
    expect(rawSql).toContain('(tenant_id, normalized_e164, neighbor_id, sort_order, id)');
  });

  it('drops the canonical normalized_e164 lookup index on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_neighbor_phones_tenant_normalized_e164_idx');
  });
});
