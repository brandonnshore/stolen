import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler';

/**
 * Middleware to validate request using express-validator
 * Must be used after validation chains
 */
export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    const firstError = errorMessages[0];

    // Return first validation error
    throw new ApiError(400, firstError);
  }

  next();
};
