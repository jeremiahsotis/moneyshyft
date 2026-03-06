import type { Knex } from 'knex';
import db from '../config/knex';

export type AnalyticsEventName =
  | 'signup_completed'
  | 'setup_wizard_completed'
  | 'budget_month_created'
  | 'transaction_created'
  | 'extra_money_assigned';

export class AnalyticsService {
  static async recordEvent(
    eventName: AnalyticsEventName,
    householdId?: string | null,
    userId?: string | null,
    metadata: Record<string, unknown> = {},
    trx: Knex | Knex.Transaction = db
  ): Promise<void> {
    await trx('analytics_events').insert({
      household_id: householdId || null,
      user_id: userId || null,
      event_name: eventName,
      metadata,
      created_at: trx.fn.now(),
    });
  }
}
