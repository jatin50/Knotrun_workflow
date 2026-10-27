import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Seed demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@example.com",
      password: passwordHash,
    },
  });

  // 2. Seed default workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo-workspace",
      ownerId: user.id,
    },
  });

  // 3. Seed demo showcase workflow
  let workflow = await prisma.workflow.findFirst({
    where: { workspaceId: workspace.id, name: "Showcase: Data Transform & Branching" },
  });

  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        workspaceId: workspace.id,
        name: "Showcase: Data Transform & Branching",
        description: "Pre-built sample workflow demonstrating JavaScript code transformation, wait pause, and conditional IF routing.",
        active: true,
        version: 1,
      },
    });

    const node1Id = "node-trigger-1";
    const node2Id = "node-code-2";
    const node3Id = "node-wait-3";
    const node4Id = "node-if-4";
    const node5Id = "node-var-true-5";
    const node6Id = "node-var-false-6";

    // Create showcase nodes
    await prisma.node.createMany({
      data: [
        {
          id: node1Id,
          workflowId: workflow.id,
          type: "trigger.manual",
          positionX: 50,
          positionY: 200,
          configuration: {},
        },
        {
          id: node2Id,
          workflowId: workflow.id,
          type: "data.code",
          positionX: 300,
          positionY: 200,
          configuration: {
            code: "return {\n  user: 'Alex Rivers',\n  score: 88,\n  role: 'Engineer',\n  timestamp: new Date().toISOString()\n};",
          },
        },
        {
          id: node3Id,
          workflowId: workflow.id,
          type: "logic.wait",
          positionX: 550,
          positionY: 200,
          configuration: {
            seconds: 1,
          },
        },
        {
          id: node4Id,
          workflowId: workflow.id,
          type: "logic.if",
          positionX: 800,
          positionY: 200,
          configuration: {
            condition: "input.score >= 80",
          },
        },
        {
          id: node5Id,
          workflowId: workflow.id,
          type: "data.setVariable",
          positionX: 1100,
          positionY: 100,
          configuration: {
            key: "approvalStatus",
            value: "APPROVED_HIGH_PRIORITY",
          },
        },
        {
          id: node6Id,
          workflowId: workflow.id,
          type: "data.setVariable",
          positionX: 1100,
          positionY: 320,
          configuration: {
            key: "approvalStatus",
            value: "NEEDS_MANUAL_REVIEW",
          },
        },
      ],
    });

    // Connect the showcase nodes
    await prisma.connection.createMany({
      data: [
        {
          workflowId: workflow.id,
          sourceNode: node1Id,
          targetNode: node2Id,
        },
        {
          workflowId: workflow.id,
          sourceNode: node2Id,
          targetNode: node3Id,
        },
        {
          workflowId: workflow.id,
          sourceNode: node3Id,
          targetNode: node4Id,
        },
        {
          workflowId: workflow.id,
          sourceNode: node4Id,
          targetNode: node5Id,
          sourceHandle: "true",
        },
        {
          workflowId: workflow.id,
          sourceNode: node4Id,
          targetNode: node6Id,
          sourceHandle: "false",
        },
      ],
    });
  }

  console.log("Seeding complete!");
  console.log("Default User:", user.email, "(password: password123)");
  console.log("Default Workspace:", workspace.name);
  console.log("Showcase Workflow:", workflow.name);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
