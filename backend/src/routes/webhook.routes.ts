import { Router } from "express";
import { receiveWebhook } from "../controllers/webhook.controller";
import { createRateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Protect webhook ingestion against flood/DoS (120 requests / minute / IP)
const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: "Webhook rate limit exceeded, please slow down requests.",
});

router.post("/:token", webhookLimiter, receiveWebhook);

export default router;
