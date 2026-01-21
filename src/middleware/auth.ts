import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user info to request
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as {
      userId: number;
      userRole: string;
      email: string;
    };

    req.userId = decoded.userId;
    req.userRole = decoded.userRole;
    next();
  } catch (error) {
    return sendError(res, 'UNAUTHORIZED', 401);
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return sendError(res, 'FORBIDDEN', 403);
    }
    next();
  };
};
