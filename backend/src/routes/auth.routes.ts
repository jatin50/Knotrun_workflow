import { Router } from "express";
import { register, login, logout, me, refresh } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { createRateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Protect registration against automated account mass-creation (5 requests / minute / IP)
const registerLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: "Too many accounts created from this IP, please try again in a minute.",
});

// Protect login against credential brute-forcing (10 attempts / minute / IP)
const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: "Too many login attempts, please try again in a minute.",
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", authenticate, me);

export default router;
