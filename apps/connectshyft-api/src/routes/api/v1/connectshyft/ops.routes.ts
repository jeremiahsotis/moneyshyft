import { Router } from 'express';
import {
  getConnectOpsBridgeVisibility,
  getConnectOpsIdentityVisibility,
  getConnectOpsThreadVisibility,
} from '../../../../modules/connectshyft/http/ops.handlers';

const router = Router();

router.get('/identity/:phone', getConnectOpsIdentityVisibility);
router.get('/threads/:threadId', getConnectOpsThreadVisibility);
router.get('/bridge/:bridgeId', getConnectOpsBridgeVisibility);

export default router;
