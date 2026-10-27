import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { executionQueue } from "../queue/executionQueue";

const MAX_PAYLOAD_BYTES = 1_000_000; // 1MB payload limit

export async function receiveWebhook(req: Request, res: Response) {
  const token = req.params.token as string;

  // 1. Enforce payload size limit against memory exhaustion attacks
  const rawBody = req.body;
  if (rawBody && JSON.stringify(rawBody).length > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: "Payload too large. Maximum 1MB allowed." });
  }

  // 2. Fetch trigger and verify workflow exists & is active
  const trigger = await prisma.trigger.findUnique({
    where: { webhookToken: token },
    include: { workflow: { select: { active: true } } },
  });

  if (!trigger) {
    return res.status(404).json({ error: "Unknown webhook" });
  }

  if (!trigger.workflow?.active) {
    return res.status(403).json({
      error: "This workflow is currently inactive. Activate it in the editor before sending webhooks.",
    });
  }

  const nodeCount = await prisma.node.count({ where: { workflowId: trigger.workflowId } });
  if (nodeCount === 0) {
    return res.status(400).json({ error: "This workflow has no nodes to run" });
  }

  const execution = await prisma.execution.create({
    data: { workflowId: trigger.workflowId, status: "PENDING" },
  });

  // Extract safe subset of headers rather than storing credentials/cookies
  const safeHeaders: Record<string, string | string[] | undefined> = {
    "content-type": req.headers["content-type"],
    "user-agent": req.headers["user-agent"],
    "x-forwarded-for": req.headers["x-forwarded-for"],
  };

  await executionQueue.add("run", {
    executionId: execution.id,
    workflowId: trigger.workflowId,
    triggerNodeId: trigger.nodeId,
    payload: {
      body: rawBody,
      headers: safeHeaders,
      receivedAt: new Date().toISOString(),
    },
  });

  return res.status(202).json({ executionId: execution.id });
}
