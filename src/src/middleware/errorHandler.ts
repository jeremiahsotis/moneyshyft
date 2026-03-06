import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ValidationError } from 'joi';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle Joi validation errors
  if (err.name === 'ValidationError' && (err as ValidationError).isJoi) {
    const validationError = err as ValidationError;
    return res.status(400).json({
      error: 'Validation error',
      details: validationError.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Handle database errors
  if (err.name === 'QueryFailedError' || err.message.includes('database')) {
    return res.status(500).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
