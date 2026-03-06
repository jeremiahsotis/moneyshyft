import express from 'express';
import knex from '../../../config/knex';
import { authenticateToken, requireHouseholdAccess } from '../../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.use(authenticateToken, requireHouseholdAccess);

/**
 * GET /api/v1/settings
 * Fetch household settings (creates defaults if missing)
 */
router.get('/', async (req, res) => {
  try {
    const householdId = req.user!.householdId;

    let settings = await knex('household_settings')
      .where({ household_id: householdId })
      .first();

    if (!settings) {
      [settings] = await knex('household_settings')
        .insert({
          id: uuidv4(),
          household_id: householdId,
          extra_money_threshold: 100.00
        })
        .returning('*');
    }

    res.json({ data: settings });
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/v1/settings
 * Update household settings
 */
router.patch('/', async (req, res) => {
  try {
    const householdId = req.user!.householdId;
    const { extra_money_threshold } = req.body;

    const [updated] = await knex('household_settings')
      .where({ household_id: householdId })
      .update({
        extra_money_threshold,
        updated_at: knex.fn.now()
      })
      .returning('*');

    res.json({ data: updated });
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
