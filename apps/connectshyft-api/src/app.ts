import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from './utils/logger';

const app = express();
const useMinimalAppShell = process.env.CONNECTSHYFT_MINIMAL_APP === '1';
const noopMiddleware = (_req: any, _res: any, next: any) => next();
const optionalAuth = useMinimalAppShell ? noopMiddleware : require('./middleware/auth').optionalAuth;
const requestCorrelation = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/requestCorrelation').requestCorrelation;
const tenancyContext = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/tenancyContext').tenancyContext;
const authContext = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/authContext').authContext;
const responseEnvelope = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/responseEnvelope').responseEnvelope;
const csrfProtection = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/csrfProtection').csrfProtection;
const connectShyftRouter = useMinimalAppShell
  ? express.Router()
  : require('./routes/api/v1/connectshyft').default;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = Buffer.from(buf);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);
app.use(requestCorrelation);
app.use(tenancyContext);
app.use(authContext);
app.use(responseEnvelope);

app.use((req: any, _res: any, next: any) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/work-intents', (_req: any, res: any) => {
  res.json({
    id: 'wi_1',
    status: 'open',
    intentType: 'needs_follow_up',
  });
});

app.use(csrfProtection);
app.use('/api/v1/connectshyft', connectShyftRouter);

app.use((req: any, res: any) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((error: unknown, _req: any, res: any, _next: any) => {
  logger.error('Unhandled connectshyft api error', error);
  res.status(500).json({
    ok: false,
    code: 'CONNECTSHYFT_UNHANDLED_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
});

export default app;
