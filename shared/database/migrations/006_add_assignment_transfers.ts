import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('assignment_transfers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');

    // Source (what we're transferring FROM)
    table.uuid('from_category_id').nullable().references('id').inTable('categories').onDelete('CASCADE');
    table.uuid('from_section_id').nullable().references('id').inTable('category_sections').onDelete('CASCADE');

    // Destination (what we're transferring TO)
    table.uuid('to_category_id').nullable().references('id').inTable('categories').onDelete('CASCADE');
    table.uuid('to_section_id').nullable().references('id').inTable('category_sections').onDelete('CASCADE');

    table.decimal('amount', 15, 2).notNullable();
    table.string('month', 7).notNullable(); // YYYY-MM format
    table.text('notes').nullable();
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('household_id');
    table.index('month');
    table.index('from_category_id');
    table.index('to_category_id');
    table.index('created_at');
  });

  // Add check constraints using raw SQL
  await knex.raw(`
    ALTER TABLE assignment_transfers
    ADD CONSTRAINT from_category_or_section
    CHECK ((from_category_id IS NOT NULL) OR (from_section_id IS NOT NULL))
  `);

  await knex.raw(`
    ALTER TABLE assignment_transfers
    ADD CONSTRAINT to_category_or_section
    CHECK ((to_category_id IS NOT NULL) OR (to_section_id IS NOT NULL))
  `);

  console.log('✅ Created assignment_transfers table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('assignment_transfers');
}
