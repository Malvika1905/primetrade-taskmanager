import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticate = (req: any, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authentication failed: No token provided', 401));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError('Authentication failed: Invalid or expired token', 401));
  }
};

export const authorize = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication failed: User not authenticated', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Access denied: Insufficient permissions', 403));
      return;
    }

    next();
  };
};
