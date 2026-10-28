import prisma from "../lib/prisma";
import { executionQueue } from "./executionQueue";
import { connection } from "./connection";

export function scheduleJobId(nodeId: string): string {
  return `schedule:${nodeId}`;
}

export async function syncWorkflowSchedulers(workflowId: string): Promise<void> {
  if (connection.status !== "ready") return;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: {
          where: { type: "trigger.schedule" },
        },
      },
    });

    if (!workflow) return;

    if (!workflow.active) {
      // Workflow is inactive: remove any active schedulers for its nodes
      for (const node of workflow.nodes) {
        await executionQueue.removeJobScheduler(scheduleJobId(node.id)).catch(() => {});
      }
      return;
    }

    // Workflow is active: upsert schedulers for all its schedule nodes
    for (const node of workflow.nodes) {
      const cron = (node.configuration as { cron?: string } | undefined)?.cron;
      if (!cron || !cron.trim()) continue;

      await executionQueue.upsertJobScheduler(
        scheduleJobId(node.id),
        { pattern: cron.trim() },
        {
          name: "scheduled-trigger",
          data: { workflowId: workflow.id, triggerNodeId: node.id },
        }
      );
      console.log(`[Scheduler] Registered schedule '${cron.trim()}' for node ${node.id} in workflow ${workflow.name}`);
    }
  } catch (err) {
    console.warn(`[Scheduler] Failed to sync schedulers for workflow ${workflowId}:`, (err as Error).message);
  }
}

export async function reconcileAllSchedulers(): Promise<void> {
  if (connection.status !== "ready") return;

  try {
    const activeWorkflows = await prisma.workflow.findMany({
      where: { active: true },
      include: {
        nodes: {
          where: { type: "trigger.schedule" },
        },
      },
    });

    let count = 0;
    for (const workflow of activeWorkflows) {
      for (const node of workflow.nodes) {
        const cron = (node.configuration as { cron?: string } | undefined)?.cron;
        if (!cron || !cron.trim()) continue;

        await executionQueue.upsertJobScheduler(
          scheduleJobId(node.id),
          { pattern: cron.trim() },
          {
            name: "scheduled-trigger",
            data: { workflowId: workflow.id, triggerNodeId: node.id },
          }
        );
        count++;
      }
    }
    console.log(`[Scheduler] Reconciled ${count} active schedule triggers in BullMQ.`);
  } catch (err) {
    console.warn("[Scheduler] Schedulers reconciliation warning:", (err as Error).message);
  }
}
