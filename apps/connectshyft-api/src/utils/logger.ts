import winston from 'winston';

type ConsoleTransportOptions = ConstructorParameters<typeof winston.transports.Console>[0];
type FileTransportOptions = ConstructorParameters<typeof winston.transports.File>[0];

const consoleTransportOptions = {
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
} as unknown as ConsoleTransportOptions;

const errorFileTransportOptions = {
  filename: 'error.log',
  level: 'error'
} as unknown as FileTransportOptions;

const combinedFileTransportOptions = {
  filename: 'combined.log'
} as unknown as FileTransportOptions;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'moneyshyft-api' },
  transports: [
    new winston.transports.Console(consoleTransportOptions)
  ]
});

// In production, you might want to add file transports
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File(errorFileTransportOptions));
  logger.add(new winston.transports.File(combinedFileTransportOptions));
}

export default logger;
