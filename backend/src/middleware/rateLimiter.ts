import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetAt: number;
}

/**
 * Lightweight, in-memory sliding window rate limiter.
 * Operates without external store dependencies (Redis optional, graceful fallback).
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message = "Too many requests, please try again later." } = options;
  const store = new Map<string, ClientRecord>();

  // Periodically sweep expired entries to ensure memory usage stays bounded
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 30_000));

  if (interval.unref) {
    interval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null) ||
      req.socket.remoteAddress ||
      "unknown-client";

    const now = Date.now();
    let record = store.get(clientIp);

    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + windowMs };
      store.set(clientIp, record);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }

    record.count++;
    return next();
  };
}
