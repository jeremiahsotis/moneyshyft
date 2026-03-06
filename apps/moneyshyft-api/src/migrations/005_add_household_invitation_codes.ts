import { Knex } from 'knex';
import { randomBytes } from 'crypto';

/**
 * Generate a unique 6-character alphanumeric invitation code
 * Format: ABC123 (uppercase letters and numbers only)
 */
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0, O, 1, I)
  let code = '';
  const bytes = randomBytes(6);

  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
}

export async function up(knex: Knex): Promise<void> {
  // 1. Add invitation_code column to households table (nullable initially)
  await knex.schema.table('households', (table) => {
    table.string('invitation_code', 10).nullable();
  });

  // 2. Backfill invitation codes for existing households
  const households = await knex('households').select('id');

  for (const household of households) {
    let code = generateInvitationCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    // Ensure uniqueness (with retry logic)
    while (!isUnique && attempts < maxAttempts) {
      const existing = await knex('households')
        .where({ invitation_code: code })
        .first();

      if (!existing) {
        isUnique = true;
      } else {
        code = generateInvitationCode();
        attempts++;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique invitation code after 100 attempts');
    }

    await knex('households')
      .where({ id: household.id })
      .update({ invitation_code: code });
  }

  // 3. Add unique constraint and make NOT NULL now that all households have codes
  await knex.schema.alterTable('households', (table) => {
    table.string('invitation_code', 10).notNullable().alter();
  });

  await knex.schema.alterTable('households', (table) => {
    table.unique(['invitation_code']);
  });

  console.log(`✅ Added and backfilled invitation codes for ${households.length} household(s)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('households', (table) => {
    table.dropColumn('invitation_code');
  });
}
