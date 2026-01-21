import { Response } from 'express';

/**
 * Strict response format helper
 * All API responses must follow this exact format
 */
export const sendSuccess = (res: Response, data: any, statusCode: number = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

export const sendError = (res: Response, errorCode: string, statusCode: number = 400) => {
  res.status(statusCode).json({
    success: false,
    data: null,
    error: errorCode, // Must be a string, not an object
  });
};
