import express from 'express';
import { ExtraMoneyService } from '../../../services/ExtraMoneyService';
import { authenticateToken, requireHouseholdAccess } from '../../../middleware/auth';
import {
  createExtraMoneySchema,
  assignExtraMoneySchema,
  queryExtraMoneySchema,
  savePreferencesSchema,
  assignGoalsSchema
} from '../../../validators/extra-money.validators';

const router = express.Router();

// All routes require authentication and household access
router.use(authenticateToken, requireHouseholdAccess);

/**
 * GET /extra-money
 * Get all extra money entries for household
 * Query params: ?status=pending|assigned|ignored
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    // Validate query params
    if (status) {
      const { error } = queryExtraMoneySchema.validate({ status });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
    }

    const entries = await ExtraMoneyService.getAllEntries(
      householdId,
      status as 'pending' | 'assigned' | 'ignored' | undefined
    );

    res.json({ data: entries });
  } catch (error: any) {
    console.error('Failed to fetch extra money entries:', error);
    res.status(500).json({ error: 'Failed to fetch extra money entries' });
  }
});

/**
 * GET /extra-money/pending
 * Get pending extra money entries (convenience endpoint)
 */
router.get('/pending', async (req, res) => {
  try {
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const entries = await ExtraMoneyService.getPendingEntries(householdId);

    res.json({ data: entries });
  } catch (error: any) {
    console.error('Failed to fetch pending entries:', error);
    res.status(500).json({ error: 'Failed to fetch pending entries' });
  }
});

/**
 * POST /extra-money
 * Create new extra money entry (manual)
 */
router.post('/', async (req, res) => {
  try {
    const { error } = createExtraMoneySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const userId = req.user!.userId;

    const entry = await ExtraMoneyService.createExtraMoneyEntry({
      household_id: householdId,
      user_id: userId,
      ...req.body
    });

    res.status(201).json({ data: entry });
  } catch (error: any) {
    console.error('Failed to create extra money entry:', error);
    res.status(500).json({ error: 'Failed to create extra money entry' });
  }
});

/**
 * POST /extra-money/:id/assign
 * Assign extra money to categories
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const { error } = assignExtraMoneySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const { assignments, savings_reserve } = req.body;
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const userId = req.user!.userId;

    const entry = await ExtraMoneyService.assignToCategories(
      id,
      householdId,
      userId,
      assignments,
      savings_reserve
    );

    res.json({ data: entry });
  } catch (error: any) {
    console.error('Failed to assign extra money:', error);
    res.status(500).json({ error: error.message || 'Failed to assign extra money' });
  }
});

/**
 * POST /extra-money/:id/assign-goals
 * Assign savings reserve to goals
 */
router.post('/:id/assign-goals', async (req, res) => {
  try {
    const { error } = assignGoalsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const { allocations } = req.body;
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const userId = req.user!.userId;

    const entry = await ExtraMoneyService.assignSavingsToGoals(
      id,
      householdId,
      userId,
      allocations
    );

    res.json({ data: entry });
  } catch (error: any) {
    console.error('Failed to assign savings to goals:', error);
    res.status(500).json({ error: error.message || 'Failed to assign savings to goals' });
  }
});

/**
 * POST /extra-money/:id/ignore
 * Mark entry as ignored (not actually extra money)
 */
router.post('/:id/ignore', async (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const userId = req.user!.userId;

    const entry = await ExtraMoneyService.ignoreEntry(id, householdId, userId);

    res.json({ data: entry });
  } catch (error: any) {
    console.error('Failed to ignore extra money entry:', error);
    res.status(500).json({ error: error.message || 'Failed to ignore entry' });
  }
});

/**
 * DELETE /extra-money/:id
 * Delete extra money entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    await ExtraMoneyService.deleteEntry(id, householdId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete extra money entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

/**
 * POST /extra-money/scan
 * Run detection scan on recent income entries
 */
router.post('/scan', async (req, res) => {
  try {
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const flaggedCount = await ExtraMoneyService.runDetectionScan(householdId);

    res.json({
      success: true,
      flagged_count: flaggedCount,
      message: `Scanned recent income and flagged ${flaggedCount} potential extra money entries`
    });
  } catch (error: any) {
    console.error('Failed to run detection scan:', error);
    res.status(500).json({ error: 'Failed to run detection scan' });
  }
});

/**
 * GET /extra-money/preferences
 * Get household's extra money preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const preferences = await ExtraMoneyService.getPreferences(householdId);

    res.json({ data: preferences });
  } catch (error: any) {
    console.error('Failed to fetch preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * POST /extra-money/preferences
 * Save or update extra money preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const { error } = savePreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const {
      category_percentages,
      section_percentages,
      default_categories,
      default_sections,
      reserve_percentage
    } = req.body;

    const preferences = await ExtraMoneyService.savePreferences(
      householdId,
      category_percentages,
      default_categories,
      section_percentages,
      default_sections,
      reserve_percentage
    );

    res.json({ data: preferences });
  } catch (error: any) {
    console.error('Failed to save preferences:', error);
    res.status(500).json({ error: error.message || 'Failed to save preferences' });
  }
});

/**
 * POST /extra-money/recommendations
 * Calculate recommended assignments for an amount
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const householdId = req.user!.householdId;
    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }
    const recommendations = await ExtraMoneyService.calculateRecommendations(
      householdId,
      amount
    );

    res.json({ data: recommendations });
  } catch (error: any) {
    console.error('Failed to calculate recommendations:', error);
    res.status(500).json({ error: 'Failed to calculate recommendations' });
  }
});

export default router;
