import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('scenarios', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
        table.string('name', 255).notNullable();
        table.text('description');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

        table.index('household_id');
    });

    await knex.schema.createTable('scenario_items', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        table.uuid('scenario_id').notNullable().references('id').inTable('scenarios').onDelete('CASCADE');
        table.string('type', 50).notNullable(); // 'income_adjustment', 'expense_adjustment', 'one_time_expense', 'one_time_income'
        table.string('scope', 50).notNullable(); // 'global', 'category', 'section'

        // Target references - nullable depending on scope
        table.uuid('category_id').references('id').inTable('categories').onDelete('CASCADE');
        table.uuid('section_id').references('id').inTable('category_sections').onDelete('CASCADE');

        table.decimal('amount', 15, 2).notNullable();
        table.boolean('is_percentage').notNullable().defaultTo(false);

        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

        table.index('scenario_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('scenario_items');
    await knex.schema.dropTableIfExists('scenarios');
}
