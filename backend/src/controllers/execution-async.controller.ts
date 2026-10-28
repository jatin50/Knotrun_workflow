import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { executionQueue } from "../queue/executionQueue";

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

  try {
    await executionQueue.add("run", { executionId: execution.id, workflowId });
  } catch (queueErr) {
    await prisma.execution.update({
      where: { id: execution.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    return res.status(503).json({
      error:
        "Queue worker is currently unreachable. Make sure Redis is running and REDIS_URL in .env is valid, or use 'Test (Sync)'.",
      details: (queueErr as Error).message,
    });
  }

  // 202 Accepted: the job is queued, not finished — the client polls
  // GET /api/executions/:id for status instead of waiting here.
  return res.status(202).json({ execution });
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
      nodeType: d.node.type,
      input: d.input,
      output: d.output,
    })),
  });
}
