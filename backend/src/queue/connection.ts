import Redis, { RedisOptions } from "ioredis";

let redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL must be set in .env before starting the server or worker");
}

// Upstash cloud endpoints enforce TLS and require the rediss:// scheme
if (redisUrl.includes("upstash.io") && redisUrl.startsWith("redis://")) {
  redisUrl = redisUrl.replace("redis://", "rediss://");
}

const isTls = redisUrl.startsWith("rediss://");

const options: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 8000,
  retryStrategy(times) {
    // Exponential backoff capped at 3s so reconnection is responsive without spamming
    return Math.min(times * 200, 3000);
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

if (isTls) {
  options.tls = { rejectUnauthorized: false };
}

export const connection = new Redis(redisUrl, options);

connection.on("connect", () => {
  console.log("[Redis] Connected successfully to Redis cluster.");
});

connection.on("error", (err) => {
  console.warn(`[Redis] Connection warning: ${err.message}`);
});

export function isRedisReady(): boolean {
  return connection.status === "ready";
}
