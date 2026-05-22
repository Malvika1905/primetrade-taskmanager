import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url} - Status: ${statusCode} - Message: ${message}`);
  if (err.stack && config.nodeEnv === 'development') {
    console.error(err.stack);
  }

  if (config.nodeEnv === 'development') {
    res.status(statusCode).json({
      status: 'error',
      message,
      stack: err.stack,
      error: err,
    });
  } else {
    res.status(statusCode).json({
      status: 'error',
      message: err instanceof AppError && err.isOperational ? message : 'Internal Server Error',
    });
  }
};
