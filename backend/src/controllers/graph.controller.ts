import { Request, Response } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { executionQueue } from "../queue/executionQueue";
import { connection } from "../queue/connection";
import { syncWorkflowSchedulers } from "../queue/scheduler";

interface IncomingNode {
  id: string; // client-generated id (React Flow's node.id) — used as the DB id too
  type: string;
  positionX: number;
  positionY: number;
  configuration?: unknown;
}

interface IncomingConnection {
  id?: string;
  sourceNode: string;
  targetNode: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

interface DbTrigger {
  nodeId: string;
  type: string;
  webhookToken: string | null;
}

async function assertWorkflowOwnership(workflowId: string, userId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, workspace: { ownerId: userId } },
  });
}

export async function getGraph(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const workflow = await assertWorkflowOwnership(id, userId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const [nodes, connections] = await Promise.all([
      prisma.node.findMany({ where: { workflowId: id } }),
      prisma.connection.findMany({ where: { workflowId: id } }),
    ]);

    return res.json({ nodes, connections });
  } catch (err) {
    console.error("[Graph] Failed to get graph:", (err as Error).message);
    return res.status(500).json({ error: "Failed to load workflow graph", details: (err as Error).message });
  }
}

function scheduleJobId(nodeId: string) {
  return `schedule:${nodeId}`;
}

export async function saveGraph(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const nodes = req.body?.nodes;
    const connections = req.body?.connections;

    if (!Array.isArray(nodes) || !Array.isArray(connections)) {
      return res.status(400).json({ error: "nodes and connections must be arrays" });
    }

    if (nodes.length > 200) {
      return res.status(400).json({ error: "Maximum workflow node limit exceeded (200 max)" });
    }

    if (connections.length > 500) {
      return res.status(400).json({ error: "Maximum workflow connection limit exceeded (500 max)" });
    }

    const typedNodes: IncomingNode[] = [];
    for (const n of nodes) {
      if (!n || typeof n.id !== "string" || !n.id.trim() || n.id.length > 64) {
        return res.status(400).json({ error: "Invalid node id" });
      }
      if (typeof n.type !== "string" || !n.type.trim() || n.type.length > 64) {
        return res.status(400).json({ error: "Invalid node type" });
      }
      typedNodes.push({
        id: String(n.id).trim(),
        type: String(n.type).trim(),
        positionX: Number.isFinite(n.positionX) ? Number(n.positionX) : 0,
        positionY: Number.isFinite(n.positionY) ? Number(n.positionY) : 0,
        configuration: (n.configuration && typeof n.configuration === "object") ? n.configuration : {},
      });
    }

    const typedConnections: IncomingConnection[] = [];
    for (const c of connections) {
      if (!c || typeof c.sourceNode !== "string" || typeof c.targetNode !== "string") {
        return res.status(400).json({ error: "Connections must specify sourceNode and targetNode" });
      }
      typedConnections.push({
        id: typeof c.id === "string" ? c.id : undefined,
        sourceNode: String(c.sourceNode).trim(),
        targetNode: String(c.targetNode).trim(),
        sourceHandle: typeof c.sourceHandle === "string" ? c.sourceHandle : null,
        targetHandle: typeof c.targetHandle === "string" ? c.targetHandle : null,
      });
    }

    const workflow = await assertWorkflowOwnership(id, userId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    const existingTriggers = await prisma.trigger.findMany({ where: { workflowId: id } });
    const existingTriggerByNodeId = new Map<string, DbTrigger>(
      existingTriggers.map((t: DbTrigger) => [t.nodeId, t])
    );

    const triggerNodes = typedNodes.filter(
      (n) => n.type === "trigger.webhook" || n.type === "trigger.schedule"
    );

    // Fast atomic transaction configured for cloud pooler latency
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.connection.deleteMany({ where: { workflowId: id } });
        await tx.node.deleteMany({ where: { workflowId: id } });

        if (typedNodes.length > 0) {
          await tx.node.createMany({
            data: typedNodes.map((n) => ({
              id: n.id,
              workflowId: id,
              type: n.type,
              positionX: n.positionX,
              positionY: n.positionY,
              configuration: (n.configuration ?? {}) as object,
            })),
          });
        }

        if (typedConnections.length > 0) {
          await tx.connection.createMany({
            data: typedConnections.map((c) => ({
              workflowId: id,
              sourceNode: c.sourceNode,
              targetNode: c.targetNode,
              sourceHandle: c.sourceHandle ?? null,
              targetHandle: c.targetHandle ?? null,
            })),
          });
        }

        if (triggerNodes.length > 0) {
          await tx.trigger.createMany({
            data: triggerNodes.map((node) => {
              const existing = existingTriggerByNodeId.get(node.id);
              const type = node.type === "trigger.webhook" ? "webhook" : "schedule";
              return {
                workflowId: id,
                nodeId: node.id,
                type,
                configuration: (node.configuration ?? {}) as object,
                webhookToken:
                  type === "webhook"
                    ? (existing?.webhookToken ?? crypto.randomBytes(16).toString("hex"))
                    : null,
              };
            }),
          });
        }

        await tx.workflow.update({
          where: { id },
          data: { version: { increment: 1 } },
        });
      },
      { timeout: 30000, maxWait: 15000 }
    );

    // Reconcile BullMQ's repeatable jobs for schedule triggers safely
    syncWorkflowSchedulers(id).catch((queueErr) => {
      console.warn("[Queue] BullMQ scheduler reconciliation skipped:", (queueErr as Error).message);
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[Graph] Failed to save graph:", (err as Error).message);
    return res.status(500).json({ error: "Failed to save workflow graph", details: (err as Error).message });
  }
}
