import { verifyAccessToken } from '../../utils/jwt';
import { createTenancyContextMiddleware } from '../../../../../libs/platform/dist/middleware/tenancyContext';

export const tenancyContext = createTenancyContextMiddleware({
  verifyAccessToken,
});
