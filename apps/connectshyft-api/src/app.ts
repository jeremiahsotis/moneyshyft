import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from './utils/logger';
import { optionalAuth } from './middleware/auth';
import { requestCorrelation } from './platform/middleware/requestCorrelation';
import { tenancyContext } from './platform/middleware/tenancyContext';
import { authContext } from './platform/middleware/authContext';
import { responseEnvelope } from './platform/middleware/responseEnvelope';
import { csrfProtection } from './platform/middleware/csrfProtection';
import connectShyftRouter from './routes/api/v1/connectshyft';

const app: Application = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);
app.use(requestCorrelation);
app.use(tenancyContext);
app.use(authContext);
app.use(responseEnvelope);

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(csrfProtection);
app.use('/api/v1/connectshyft', connectShyftRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled connectshyft api error', error);
  res.status(500).json({
    ok: false,
    code: 'CONNECTSHYFT_UNHANDLED_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
});

export default app;
