import "dotenv/config";
import dns from "node:dns";
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

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Node's fetch tries IPv6 first by default. On networks with broken/slow
// IPv6 routing, this causes HTTP Request nodes to hang until they time out —
// forcing IPv4-first resolution fixes it.
dns.setDefaultResultOrder("ipv4first");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "n8n-clone-backend",
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

app.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  await cleanupStaleExecutions();

  if (process.env.DISABLE_EMBEDDED_WORKER !== "true") {
    try {
      initWorker();
    } catch (workerErr) {
      console.warn("[Worker] Embedded worker startup warning:", (workerErr as Error).message);
    }
  }
});
