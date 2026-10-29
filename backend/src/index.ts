import "dotenv/config";
import dns from "node:dns";
import path from "node:path";
import fs from "node:fs";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import workflowRoutes from "./routes/workflow.routes";
import executionRoutes from "./routes/execution.routes";
import webhookRoutes from "./routes/webhook.routes";
import credentialRoutes from "./routes/credential.routes";
import { authenticate } from "./middleware/auth.middleware";
import prisma from "./lib/prisma";
import { initWorker } from "./worker";
import { reconcileAllSchedulers } from "./queue/scheduler";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Enable reverse proxy trust (critical on Render, Heroku, Cloudflare for HTTPS cookie verification)
app.set("trust proxy", 1);

// Node's fetch tries IPv6 first by default. On networks with broken/slow
// IPv6 routing, this causes HTTP Request nodes to hang until they time out.
dns.setDefaultResultOrder("ipv4first");

// Flexible, cloud-ready CORS configuration
const rawCors = process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:3000";
const allowedOrigins = rawCors.split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or curl requests with no origin
      if (!origin) return callback(null, true);

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isRender = origin.endsWith(".onrender.com");
      const isCustomDomain = origin.endsWith("knotrun.io");
      const isExplicitlyAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*");

      if (isLocalhost || isRender || isCustomDomain || isExplicitlyAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin ${origin} is not authorized`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health Check for Render zero-downtime deploys
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "knotrun-studio-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Authentication (public routes)
app.use("/api/auth", authRoutes);

// Workspaces, workflows, executions, credentials (JWT protected)
app.use("/api/workspaces", authenticate, workspaceRoutes);
app.use("/api/workflows", authenticate, workflowRoutes);
app.use("/api/executions", authenticate, executionRoutes);
app.use("/api/credentials", authenticate, credentialRoutes);

// Webhook endpoints (token authenticated)
app.use("/api/webhooks", webhookRoutes);

// Optional: Serve pre-built frontend if deployed as single monolithic service on Render
const frontendDist = path.resolve(__dirname, "../../frontend/dist/client");
if (fs.existsSync(frontendDist)) {
  console.log(`[Static] Serving bundled frontend from ${frontendDist}`);
  app.use(express.static(frontendDist, { maxAge: "7d", redirect: false }));
  app.get("*", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

async function cleanupStaleExecutions() {
  try {
    const updated = await prisma.execution.updateMany({
      where: {
        status: { in: ["PENDING", "RUNNING"] },
        startedAt: null,
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        logs: JSON.stringify([
          {
            nodeId: "init",
            type: "system",
            status: "failed",
            error: "Execution was aborted because worker was offline prior to server restart",
            durationMs: 0,
          },
        ]),
      },
    });
    if (updated.count > 0) {
      console.log(`[Startup] Cleaned up ${updated.count} orphaned pending executions.`);
    }
  } catch (err) {
    console.warn("[Startup] Stale execution cleanup skipped:", (err as Error).message);
  }
}

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Knotrun Backend listening on http://0.0.0.0:${PORT}`);
  await cleanupStaleExecutions();

  if (process.env.DISABLE_EMBEDDED_WORKER !== "true") {
    try {
      initWorker();
      await reconcileAllSchedulers();
    } catch (workerErr) {
      console.warn("[Worker] Embedded worker startup warning:", (workerErr as Error).message);
    }
  }
});
