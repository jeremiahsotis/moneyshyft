import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create debt_payment_plans table
  await knex.schema.createTable('debt_payment_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('household_id').notNullable()
      .references('id').inTable('households').onDelete('CASCADE');
    table.string('method', 20).notNullable(); // 'snowball' or 'avalanche'
    table.decimal('total_monthly_payment', 15, 2).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by_user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    table.index(['household_id', 'is_active']);
  });

  // Create debt_payment_schedule table
  await knex.schema.createTable('debt_payment_schedule', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('plan_id').notNullable()
      .references('id').inTable('debt_payment_plans').onDelete('CASCADE');
    table.uuid('debt_id').notNullable()
      .references('id').inTable('debts').onDelete('CASCADE');
    table.decimal('payment_amount', 15, 2).notNullable();
    table.integer('payment_order').notNullable(); // Order in payoff sequence
    table.boolean('is_extra_payment').notNullable().defaultTo(false); // Above minimum

    table.index(['plan_id']);
    table.index(['debt_id']);
  });

  console.log('✅ Created debt_payment_plans and debt_payment_schedule tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('debt_payment_schedule');
  await knex.schema.dropTableIfExists('debt_payment_plans');
}
