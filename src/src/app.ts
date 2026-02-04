import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger';
import pool from './config/database';

// Load environment variables
dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoints (will be replaced with actual routes)
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'MoneyShyft API - Family budgeting made simple' });
});

app.get('/db-test', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      database: 'connected',
      currentTime: result.rows[0].current_time
    });
  } catch (error) {
    logger.error('Database test failed', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
import authRoutes from './routes/api/v1/auth';
import accountRoutes from './routes/api/v1/accounts';
import transactionRoutes from './routes/api/v1/transactions';
import splitRoutes from './routes/api/v1/splits';
import categoryRoutes from './routes/api/v1/categories';
import goalRoutes from './routes/api/v1/goals';
import budgetRoutes from './routes/api/v1/budgets';
import incomeRoutes from './routes/api/v1/income';
import debtRoutes from './routes/api/v1/debts';
import assignmentRoutes from './routes/api/v1/assignments';
import householdRoutes from './routes/api/v1/households';
import recurringRoutes from './routes/api/v1/recurring-transactions';
import extraMoneyRoutes from './routes/api/v1/extra-money';
import settingsRoutes from './routes/api/v1/settings';
import scenarioRoutes from './routes/api/v1/scenarios';
import tagRoutes from './routes/api/v1/tags';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/transactions', splitRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/income', incomeRoutes);
app.use('/api/v1/debts', debtRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/households', householdRoutes);
app.use('/api/v1/recurring-transactions', recurringRoutes);
app.use('/api/v1/extra-money', extraMoneyRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/scenarios', scenarioRoutes);
app.use('/api/v1/tags', tagRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

export default app;
