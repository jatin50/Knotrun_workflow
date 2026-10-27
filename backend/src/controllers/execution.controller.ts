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

const TEST_RUN_TIMEOUT_MS = 15_000; // 15-second cap on synchronous in-process test runs

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

    const testExecutionPromise = runWorkflowTest(
      resolvedNodes,
      connections.map((c: DbConnection) => ({
        sourceNode: c.sourceNode,
        targetNode: c.targetNode,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
      }))
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Synchronous test execution timed out after 15 seconds. Use 'Run (Queue)' for long-running workflows."
            )
          ),
        TEST_RUN_TIMEOUT_MS
      )
    );

    const { status, results } = await Promise.race([testExecutionPromise, timeoutPromise]);

    return res.json({ status, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ error: message });
  }
}
