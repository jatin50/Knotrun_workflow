import { Request, Response } from "express";
import prisma from "../lib/prisma";

// Every function here checks ownership by joining through Workspace.ownerId
// rather than trusting the workspaceId/workflowId in the URL alone —
// otherwise User A could read/edit User B's workflow just by guessing an id.

export async function listWorkflows(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workspaceId = req.params.workspaceId as string;

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId },
  });
  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const workflows = await prisma.workflow.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });

  return res.json({ workflows });
}

export async function createWorkflow(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workspaceId = req.params.workspaceId as string;
  const { name, description } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return res.status(400).json({ error: "name must be 100 characters or fewer" });
  }

  let cleanDesc: string | null = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return res.status(400).json({ error: "description must be a string" });
    }
    cleanDesc = description.slice(0, 500);
  }

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId },
  });
  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: cleanName,
      description: cleanDesc,
      workspaceId,
    },
  });

  return res.status(201).json({ workflow });
}

export async function getWorkflow(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const workflow = await prisma.workflow.findFirst({
    where: { id, workspace: { ownerId: userId } },
  });

  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  return res.json({ workflow });
}

export async function updateWorkflow(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const { name, description, active } = req.body ?? {};

  let cleanName: string | undefined = undefined;
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name cannot be empty" });
    }
    cleanName = name.trim();
    if (cleanName.length > 100) {
      return res.status(400).json({ error: "name must be 100 characters or fewer" });
    }
  }

  let cleanDesc: string | null | undefined = undefined;
  if (description !== undefined) {
    if (description === null) {
      cleanDesc = null;
    } else if (typeof description === "string") {
      cleanDesc = description.slice(0, 500);
    } else {
      return res.status(400).json({ error: "description must be a string or null" });
    }
  }

  const existing = await prisma.workflow.findFirst({
    where: { id, workspace: { ownerId: userId } },
  });
  if (!existing) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      ...(cleanName !== undefined ? { name: cleanName } : {}),
      ...(cleanDesc !== undefined ? { description: cleanDesc } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
    },
  });

  return res.json({ workflow });
}

export async function deleteWorkflow(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const existing = await prisma.workflow.findFirst({
    where: { id, workspace: { ownerId: userId } },
  });
  if (!existing) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  await prisma.workflow.delete({ where: { id } });

  return res.status(204).send();
}
