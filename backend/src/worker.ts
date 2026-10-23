import "dotenv/config";
import dns from "node:dns";
import { Worker, Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { connection } from "./queue/connection";
import { EXECUTION_QUEUE_NAME, ExecutionJobData } from "./queue/executionQueue";
import prisma from "./lib/prisma";
import { runWorkflowTest } from "./engine/engine";
import { resolveNodeCredentials } from "./engine/resolveCredentials";

interface DbNode {
  id: string;
  type: string;
  configuration: unknown;
}

interface DbConnection {
  sourceNode: string;
  targetNode: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

// Same fix as index.ts — the worker is a separate process, so it needs
// this set independently, not just the main server.
dns.setDefaultResultOrder("ipv4first");

async function processJob(job: Job<ExecutionJobData>) {
  const { workflowId, triggerNodeId } = job.data;
  let { executionId } = job.data;
  const startedAt = new Date();

  // A schedule tick has no pre-created Execution row (nothing called an
  // endpoint to make one) — it makes its own here, the moment it actually
  // fires.
  if (!executionId) {
    const execution = await prisma.execution.create({
      data: { workflowId, status: "RUNNING", startedAt },
    });
    executionId = execution.id;
  } else {
    await prisma.execution.update({
      where: { id: executionId },
      data: { status: "RUNNING", startedAt },
    });
  }

  const [workflow, nodes, connections] = await Promise.all([
    prisma.workflow.findUniqueOrThrow({ where: { id: workflowId }, select: { workspaceId: true } }),
    prisma.node.findMany({ where: { workflowId } }),
    prisma.connection.findMany({ where: { workflowId } }),
  ]);

  // Seed the trigger node's output with real data instead of its
  // executor's generic stub — a webhook's request body, or a schedule
  // tick's fire time.
  const triggerOverrides: Record<string, unknown> | undefined = triggerNodeId
    ? {
        [triggerNodeId]:
          job.data.payload ?? { source: "schedule", triggeredAt: startedAt.toISOString() },
      }
    : undefined;

  try {
    const plainNodes = nodes.map((n: DbNode) => ({
      id: n.id,
      type: n.type,
      configuration: n.configuration as Record<string, unknown>,
    }));
    const resolvedNodes = await resolveNodeCredentials(plainNodes, workflow.workspaceId);

    const { status, results } = await runWorkflowTest(
      resolvedNodes,
      connections.map((c: DbConnection) => ({
        sourceNode: c.sourceNode,
        targetNode: c.targetNode,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
      })),
      triggerOverrides
    );

    const finishedAt = new Date();

    await prisma.$transaction([
      // One ExecutionData row per node, so the frontend's log view can show
      // exactly what each node produced (or why it failed/was skipped).
      prisma.executionData.createMany({
        data: results.map((r) => ({
          executionId,
          nodeId: r.nodeId,
          // Prisma's Json columns need its special JsonNull marker instead
          // of plain `null` — plain null there means "don't touch this
          // field," JsonNull means "set it to the JSON value null."
          output:
            r.output === undefined || r.output === null
              ? Prisma.JsonNull
              : (r.output as Prisma.InputJsonValue),
        })),
      }),
      prisma.execution.update({
        where: { id: executionId },
        data: {
          status: status === "success" ? "SUCCESS" : "FAILED",
          finishedAt,
          duration: finishedAt.getTime() - startedAt.getTime(),
          logs: JSON.stringify(
            results.map((r) => ({
              nodeId: r.nodeId,
              type: r.type,
              status: r.status,
              error: r.error,
              durationMs: r.durationMs,
            }))
          ),
        },
      }),
    ]);
  } catch (err) {
    // Only a structural failure (e.g. a cycle) reaches here — per-node
    // failures are already captured inside `results` above.
    const finishedAt = new Date();
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        finishedAt,
        duration: finishedAt.getTime() - startedAt.getTime(),
        logs: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

const worker = new Worker<ExecutionJobData>(EXECUTION_QUEUE_NAME, processJob, {
  connection,
  concurrency: 2,
});

worker.on("completed", (job) => {
  console.log(`Execution ${job.data.executionId} finished`);
});

worker.on("failed", (job, err) => {
  console.error(`Execution ${job?.data.executionId} errored:`, err.message);
});

console.log("Worker listening for workflow-execution jobs...");
