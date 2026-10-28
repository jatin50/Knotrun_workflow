import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { executionQueue } from "../queue/executionQueue";
import { executeWorkflowJob } from "../worker";
import { isRedisReady } from "../queue/connection";

async function assertWorkflowOwnership(workflowId: string, userId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, workspace: { ownerId: userId } },
  });
}

export async function startExecution(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workflowId = req.params.id as string;

  const workflow = await assertWorkflowOwnership(workflowId, userId);
  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  const nodeCount = await prisma.node.count({ where: { workflowId } });
  if (nodeCount === 0) {
    return res.status(400).json({ error: "This workflow has no nodes to run" });
  }

  const execution = await prisma.execution.create({
    data: { workflowId, status: "PENDING" },
  });

  const jobData = { executionId: execution.id, workflowId };

  // Try dispatching to BullMQ queue. If Redis is unavailable or times out (>1500ms),
  // fall back to asynchronous in-process execution to ensure the job runs immediately.
  let queuedInBullMq = false;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Queue dispatch timeout")), 1500)
    );
    await Promise.race([executionQueue.add("run", jobData), timeoutPromise]);
    queuedInBullMq = true;
  } catch (queueErr) {
    console.warn(`[Queue] BullMQ dispatch skipped or timed out (${(queueErr as Error).message}). Executing in-process async worker.`);
    setImmediate(() => {
      executeWorkflowJob(jobData).catch((err) => {
        console.error(`[InProcessWorker] Execution ${execution.id} error:`, err);
      });
    });
  }

  // 202 Accepted: the job is queued/dispatched immediately without blocking the client.
  return res.status(202).json({ execution, mode: queuedInBullMq ? "queue" : "in-process" });
}

export async function listExecutions(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workflowId = req.params.id as string;

  const workflow = await assertWorkflowOwnership(workflowId, userId);
  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  const executions = await prisma.execution.findMany({
    where: { workflowId },
    orderBy: { id: "desc" },
    take: 50,
  });

  return res.json({ executions });
}

export async function getExecution(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const execution = await prisma.execution.findFirst({
    where: { id, workflow: { workspace: { ownerId: userId } } },
  });

  if (!execution) {
    return res.status(404).json({ error: "Execution not found" });
  }

  return res.json({ execution });
}

export async function getExecutionLogs(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const execution = await prisma.execution.findFirst({
    where: { id, workflow: { workspace: { ownerId: userId } } },
  });

  if (!execution) {
    return res.status(404).json({ error: "Execution not found" });
  }

  const data = await prisma.executionData.findMany({
    where: { executionId: id },
    include: { node: { select: { type: true } } },
  });

  return res.json({
    execution,
    data: data.map((d) => ({
      id: d.id,
      executionId: d.executionId,
      nodeId: d.nodeId,
      nodeType: d.node?.type ?? "unknown",
      input: d.input,
      output: d.output,
    })),
  });
}
