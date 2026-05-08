import { type NextFunction, type Request, type Response } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export const createRateLimiter = ({ windowMs, maxRequests }: RateLimitConfig) => {
  const requestsByKey = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction): void => {
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestsByKey.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      requestsByKey.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      response.status(429).json({
        message: 'Too many requests. Please wait a moment and try again.',
      });
      return;
    }

    entry.count += 1;
    next();
  };
};
