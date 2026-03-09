import app from './app';
import logger from './utils/logger';

const CANONICAL_PORT = 3002;
const PORT = parseInt(process.env.PORT || `${CANONICAL_PORT}`, 10);
const DEFAULT_HOST = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
const HOST = process.env.HOST || DEFAULT_HOST;

if (process.env.NODE_ENV === 'production' && PORT !== CANONICAL_PORT) {
  throw new Error(`connect-api must run on canonical production port ${CANONICAL_PORT}, received ${PORT}`);
}

if (process.env.NODE_ENV === 'production' && !['127.0.0.1', 'localhost'].includes(HOST)) {
  throw new Error(`connect-api must bind to localhost in production, received HOST=${HOST}`);
}

const server = app.listen(PORT, HOST, () => {
  logger.info(`ConnectShyft API server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default server;
