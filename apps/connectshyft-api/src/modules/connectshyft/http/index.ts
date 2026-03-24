import { Router } from 'express';
import { getActivityThreadsHandler } from '../handlers/getActivityThreadsHandler';
import { getPersonActivitiesHandler } from '../handlers/getPersonActivitiesHandler';
import { postProviderEventHandler } from '../handlers/postProviderEventHandler';
import { postThreadCallHandler } from '../handlers/postThreadCallHandler';
import { postPersonActivityHandler } from '../handlers/postPersonActivityHandler';
import { postVoicemailHandler } from '../handlers/postVoicemailHandler';

type ConnectShyftHttpRouterDependencies = {
  postThreadCall?: typeof postThreadCallHandler;
  postProviderEvent?: typeof postProviderEventHandler;
  postVoicemail?: typeof postVoicemailHandler;
};

export const buildConnectShyftHttpRouter = (
  dependencies: ConnectShyftHttpRouterDependencies = {},
) => {
  const router = Router();

  router.post('/people/:personId/activities', postPersonActivityHandler);
  router.get('/people/:personId/activities', getPersonActivitiesHandler);
  router.get('/activities/:activityId/threads', getActivityThreadsHandler);
  router.post('/thread/:threadId/call', dependencies.postThreadCall || postThreadCallHandler);
  router.post('/provider-events', dependencies.postProviderEvent || postProviderEventHandler);
  router.post('/voicemails', dependencies.postVoicemail || postVoicemailHandler);

  return router;
};

const router = buildConnectShyftHttpRouter();

export default router;
