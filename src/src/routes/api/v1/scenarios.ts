import express, { Request, Response } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { ScenarioService } from '../../../services/ScenarioService';
import logger from '../../../utils/logger';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET / - List all scenarios
router.get('/', async (req: Request, res: Response, next) => {
    try {
        const scenarios = await ScenarioService.getScenarios(req.user!.householdId as string);
        res.json(scenarios);
    } catch (error) {
        next(error);
    }
});

// GET /:id - Get scenario details
router.get('/:id', async (req: Request, res: Response, next) => {
    try {
        const scenario = await ScenarioService.getScenarioById(req.params.id, req.user!.householdId as string);
        res.json(scenario);
    } catch (error) {
        next(error);
    }
});

// POST / - Create scenario
router.post('/', async (req: Request, res: Response, next) => {
    try {
        const scenario = await ScenarioService.createScenario(req.user!.householdId as string, req.body);
        res.status(201).json(scenario);
    } catch (error) {
        next(error);
    }
});

// PUT /:id - Update scenario
router.put('/:id', async (req: Request, res: Response, next) => {
    try {
        const scenario = await ScenarioService.updateScenario(req.params.id, req.user!.householdId as string, req.body);
        res.json(scenario);
    } catch (error) {
        next(error);
    }
});

// DELETE /:id - Delete scenario
router.delete('/:id', async (req: Request, res: Response, next) => {
    try {
        await ScenarioService.deleteScenario(req.params.id, req.user!.householdId as string);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /:id/items - Add item to scenario
router.post('/:id/items', async (req: Request, res: Response, next) => {
    try {
        const item = await ScenarioService.addItem(req.params.id, req.user!.householdId as string, req.body);
        res.status(201).json(item);
    } catch (error) {
        next(error);
    }
});

// DELETE /items/:itemId - Remove item
router.delete('/items/:itemId', async (req: Request, res: Response, next) => {
    try {
        await ScenarioService.removeItem(req.params.itemId, req.user!.householdId as string);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// GET /:id/projection - Calculate projection
router.get('/:id/projection', async (req: Request, res: Response, next) => {
    try {
        const projection = await ScenarioService.generateProjection(req.params.id, req.user!.householdId as string);
        res.json(projection);
    } catch (error) {
        next(error);
    }
});

export default router;
