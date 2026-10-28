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

dns.setDefaultResultOrder("ipv4first");

export async function executeWorkflowJob(data: ExecutionJobData): Promise<void> {
  const { workflowId, triggerNodeId } = data;
  let { executionId } = data;
  const startedAt = new Date();

  // Retrieve workflow metadata to check active state and workspace
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: { workspaceId: true, active: true },
  });

  if (!workflow) {
    console.warn(`[Worker] Workflow ${workflowId} not found. Skipping execution.`);
    return;
  }

  // If this was triggered automatically by a schedule job, ignore if workflow is inactive
  if (!executionId && !workflow.active) {
    console.log(`[Worker] Skipping scheduled execution: workflow ${workflowId} is inactive.`);
    return;
  }

  // A schedule tick has no pre-created Execution row — it makes its own here
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

  const [nodes, connections] = await Promise.all([
    prisma.node.findMany({ where: { workflowId } }),
    prisma.connection.findMany({ where: { workflowId } }),
  ]);

  if (nodes.length === 0) {
    const finishedAt = new Date();
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        finishedAt,
        duration: finishedAt.getTime() - startedAt.getTime(),
        logs: JSON.stringify([{ nodeId: "root", type: "system", status: "failed", error: "No nodes configured in workflow", durationMs: 0 }]),
      },
    });
    return;
  }

  // Seed the trigger node's output with real data
  const triggerOverrides: Record<string, unknown> | undefined = triggerNodeId
    ? {
        [triggerNodeId]:
          data.payload ?? { source: "schedule", triggeredAt: startedAt.toISOString() },
      }
    : undefined;

  try {
    const plainNodes = nodes.map((n: DbNode) => ({
      id: n.id,
      type: n.type,
      configuration: n.configuration as Record<string, unknown>,
    }));
    const resolvedNodes = await resolveNodeCredentials(plainNodes, workflow.workspaceId);

    // Hard execution cap for background worker jobs to prevent thread starvation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Worker execution exceeded maximum 60s timeout")), 60_000)
    );

    const { status, results } = await Promise.race([
      runWorkflowTest(
        resolvedNodes,
        connections.map((c: DbConnection) => ({
          sourceNode: c.sourceNode,
          targetNode: c.targetNode,
          sourceHandle: c.sourceHandle,
          targetHandle: c.targetHandle,
        })),
        triggerOverrides
      ),
      timeoutPromise,
    ]);

    const finishedAt = new Date();

    await prisma.$transaction([
      prisma.executionData.createMany({
        data: results.map((r) => ({
          executionId: executionId!,
          nodeId: r.nodeId,
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
    console.log(`[Worker] Execution ${executionId} completed successfully with status: ${status}`);
  } catch (err) {
    const finishedAt = new Date();
    const errorMsg = err instanceof Error ? err.message : "Unknown error during workflow execution";
    console.error(`[Worker] Execution ${executionId} failed: ${errorMsg}`);
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        finishedAt,
        duration: finishedAt.getTime() - startedAt.getTime(),
        logs: JSON.stringify([{ nodeId: "error", type: "system", status: "failed", error: errorMsg, durationMs: 0 }]),
      },
    });
  }
}

export async function processJob(job: Job<ExecutionJobData>) {
  return executeWorkflowJob(job.data);
}

let activeWorker: Worker<ExecutionJobData> | null = null;

export function initWorker(): Worker<ExecutionJobData> {
  if (activeWorker) {
    return activeWorker;
  }

  activeWorker = new Worker<ExecutionJobData>(EXECUTION_QUEUE_NAME, processJob, {
    connection,
    concurrency: 4,
  });

  activeWorker.on("completed", (job) => {
    console.log(`[Worker] BullMQ job ${job.id} (Execution ${job.data.executionId}) finished`);
  });

  activeWorker.on("failed", (job, err) => {
    console.error(`[Worker] BullMQ job ${job?.id} (Execution ${job?.data.executionId}) errored:`, err.message);
  });

  activeWorker.on("error", (err) => {
    console.warn(`[Worker] Worker error event: ${err.message}`);
  });

  console.log("[Worker] BullMQ worker initialized and listening for workflow-execution jobs.");
  return activeWorker;
}

// Auto-start worker if invoked as standalone script
if (require.main === module) {
  initWorker();
  console.log("[Worker] Standalone BullMQ worker listening...");
}
