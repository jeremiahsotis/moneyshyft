import { Router } from 'express';
import { getActivityThreadsHandler } from '../handlers/getActivityThreadsHandler';
import { getPersonActivitiesHandler } from '../handlers/getPersonActivitiesHandler';
import { postPersonActivityHandler } from '../handlers/postPersonActivityHandler';

const router = Router();

router.post('/people/:personId/activities', postPersonActivityHandler);
router.get('/people/:personId/activities', getPersonActivitiesHandler);
router.get('/activities/:activityId/threads', getActivityThreadsHandler);

export default router;
