import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { encrypt } from "../lib/crypto";

async function assertWorkspaceOwnership(workspaceId: string, userId: string) {
  return prisma.workspace.findFirst({ where: { id: workspaceId, ownerId: userId } });
}

// Deliberately picks only these fields on every response in this file —
// `encryptedData` must never be selected here, even by accident, since
// that's the one guarantee this whole feature exists to make.
const SAFE_SELECT = { id: true, name: true, type: true, createdAt: true } as const;

export async function listCredentials(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workspaceId = req.params.workspaceId as string;

  const workspace = await assertWorkspaceOwnership(workspaceId, userId);
  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const credentials = await prisma.credential.findMany({
    where: { workspaceId },
    select: SAFE_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return res.json({ credentials });
}

export async function createCredential(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workspaceId = req.params.workspaceId as string;
  const { name, type, value } = req.body ?? {};

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
    return res.status(400).json({ error: "name must be between 1 and 100 characters" });
  }

  if (!type || typeof type !== "string" || type.trim().length === 0 || type.trim().length > 50) {
    return res.status(400).json({ error: "type must be between 1 and 50 characters" });
  }

  if (!value || typeof value !== "string" || value.length === 0 || value.length > 10_000) {
    return res.status(400).json({ error: "value must be between 1 and 10,000 characters" });
  }

  const workspace = await assertWorkspaceOwnership(workspaceId, userId);
  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const credential = await prisma.credential.create({
    data: { workspaceId, name: name.trim(), type: type.trim(), encryptedData: encrypt(value) },
    select: SAFE_SELECT,
  });

  return res.status(201).json({ credential });
}

export async function updateCredential(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const { name, value } = req.body ?? {};

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100)) {
    return res.status(400).json({ error: "name must be between 1 and 100 characters" });
  }
  if (value !== undefined && (typeof value !== "string" || value.length === 0 || value.length > 10_000)) {
    return res.status(400).json({ error: "value must be between 1 and 10,000 characters" });
  }

  const existing = await prisma.credential.findFirst({
    where: { id, workspace: { ownerId: userId } },
  });
  if (!existing) {
    return res.status(404).json({ error: "Credential not found" });
  }

  const credential = await prisma.credential.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(value !== undefined ? { encryptedData: encrypt(value) } : {}),
    },
    select: SAFE_SELECT,
  });

  return res.json({ credential });
}

export async function deleteCredential(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const existing = await prisma.credential.findFirst({
    where: { id, workspace: { ownerId: userId } },
  });
  if (!existing) {
    return res.status(404).json({ error: "Credential not found" });
  }

  await prisma.credential.delete({ where: { id } });
  return res.status(204).send();
}

// Convenience for the editor's node config panel, which only knows a
// workflowId, not its workspaceId — resolves through the relation so the
// frontend never needs to fetch/track workspaceId separately.
export async function listCredentialsForWorkflow(req: Request, res: Response) {
  const userId = req.user!.userId;
  const workflowId = req.params.id as string;

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, workspace: { ownerId: userId } },
  });
  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  const credentials = await prisma.credential.findMany({
    where: { workspaceId: workflow.workspaceId },
    select: SAFE_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return res.json({ credentials });
}
