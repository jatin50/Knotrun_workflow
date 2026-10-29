import Redis, { RedisOptions } from "ioredis";

let redisUrl = process.env.REDIS_URL?.trim().replace(/^["']|["']$/g, "");

if (!redisUrl) {
  console.warn(
    "[Redis] WARNING: REDIS_URL environment variable is not defined. " +
    "Background BullMQ queue workers and asynchronous scheduling will be offline. " +
    "In-memory DAG execution and visual test runs remain fully active."
  );
  // Default to localhost fallback with lazyConnect so it doesn't crash the server on boot
  redisUrl = "redis://127.0.0.1:6379";
}

// Upstash cloud endpoints enforce TLS and require the rediss:// scheme
if (redisUrl.includes("upstash.io") && redisUrl.startsWith("redis://")) {
  redisUrl = redisUrl.replace("redis://", "rediss://");
}

const isTls = redisUrl.startsWith("rediss://");

const options: RedisOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 8000,
  retryStrategy(times) {
    if (!process.env.REDIS_URL && times > 2) {
      return null;
    }
    return Math.min(times * 200, 3000);
  },
  reconnectOnError(err) {
    return err.message.includes("READONLY");
  },
};

if (isTls) {
  options.tls = { rejectUnauthorized: false };
}

export const connection = new Redis(redisUrl, options);

if (process.env.REDIS_URL) {
  connection.connect().catch((err) => {
    console.warn(`[Redis] Initial connection warning: ${err.message}`);
  });
}

connection.on("connect", () => {
  console.log("[Redis] Connected successfully to Redis cluster.");
});

connection.on("error", (err) => {
  if (process.env.REDIS_URL) {
    console.warn(`[Redis] Connection warning: ${err.message}`);
  }
});

export function isRedisReady(): boolean {
  return connection.status === "ready";
}
