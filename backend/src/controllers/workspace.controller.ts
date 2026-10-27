import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { generateUniqueWorkspaceSlug } from "../utils/slug";

export async function listWorkspaces(req: Request, res: Response) {
  const userId = req.user!.userId;

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { workflows: true } } },
  });

  return res.json({ workspaces });
}

export async function createWorkspace(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { name } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return res.status(400).json({ error: "name must be 100 characters or fewer" });
  }

  const slug = await generateUniqueWorkspaceSlug(cleanName);

  const workspace = await prisma.workspace.create({
    data: { name: cleanName, slug, ownerId: userId },
  });

  return res.status(201).json({ workspace });
}

export async function getWorkspace(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const workspace = await prisma.workspace.findFirst({
    where: { id, ownerId: userId },
  });

  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  return res.json({ workspace });
}

export async function updateWorkspace(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const { name } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return res.status(400).json({ error: "name must be 100 characters or fewer" });
  }

  const existing = await prisma.workspace.findFirst({ where: { id, ownerId: userId } });
  if (!existing) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const workspace = await prisma.workspace.update({
    where: { id },
    data: { name: cleanName },
  });

  return res.json({ workspace });
}

export async function deleteWorkspace(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const existing = await prisma.workspace.findFirst({ where: { id, ownerId: userId } });
  if (!existing) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  // Cascades to workflows/nodes/connections/executions/etc. per the
  // onDelete: Cascade relations defined in the schema.
  await prisma.workspace.delete({ where: { id } });

  return res.status(204).send();
}
