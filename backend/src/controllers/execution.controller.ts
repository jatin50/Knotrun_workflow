import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { runWorkflowTest } from "../engine/engine";
import { resolveNodeCredentials } from "../engine/resolveCredentials";

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

export async function testWorkflow(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const workflow = await prisma.workflow.findFirst({
    where: { id, workspace: { ownerId: userId } },
  });
  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  const [nodes, connections] = await Promise.all([
    prisma.node.findMany({ where: { workflowId: id } }),
    prisma.connection.findMany({ where: { workflowId: id } }),
  ]);

  if (nodes.length === 0) {
    return res.status(400).json({ error: "This workflow has no nodes to run" });
  }

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
      }))
    );

    return res.json({ status, results });
  } catch (err) {
    // Only a structural problem (e.g. a cycle) reaches here — per-node
    // failures are captured inside `results` instead of throwing.
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ error: message });
  }
}
