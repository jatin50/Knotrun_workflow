import { ApiNode, ApiConnection } from "../lib/graph.api";

export interface WorkflowTemplate {
  id: string;
  title: string;
  category: "DevOps & Monitoring" | "AI & Automation" | "Data & Analytics" | "Security & Webhooks";
  badgeColor: string;
  icon: string;
  description: string;
  estimatedOps: string;
  nodeTypes: string[];
  nodes: ApiNode[];
  connections: ApiConnection[];
}

/**
 * Instantiates a template with fresh, globally unique node IDs and remapped connections.
 * Prevents PostgreSQL primary key collisions on the `Node.id` field across multiple workflows.
 */
export function instantiateTemplate(template: WorkflowTemplate): {
  nodes: ApiNode[];
  connections: ApiConnection[];
} {
  const idMap = new Map<string, string>();

  const nodes: ApiNode[] = template.nodes.map((node, idx) => {
    const uniqueId = `node_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
    idMap.set(node.id, uniqueId);
    return {
      ...node,
      id: uniqueId,
    };
  });

  const connections: ApiConnection[] = template.connections.map((conn) => ({
    ...conn,
    sourceNode: idMap.get(conn.sourceNode) ?? conn.sourceNode,
    targetNode: idMap.get(conn.targetNode) ?? conn.targetNode,
  }));

  return { nodes, connections };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "keep-alive-pinger",
    title: "Website Uptime & Cloud Instance Keep-Alive",
    category: "DevOps & Monitoring",
    badgeColor: "border-lime-500/40 text-lime-400 bg-lime-950/30",
    icon: "🌐",
    description:
      "Periodically pings free-tier cloud deployments (Render, Supabase, Neon) to prevent cold sleep. Monitors response latency with SSRF protection and triggers alerts on degradation.",
    estimatedOps: "~150k ops/sec",
    nodeTypes: ["Schedule", "Website Pinger", "IF Branch", "Email", "Text Transform"],
    nodes: [
      {
        id: "t1-schedule",
        type: "trigger.schedule",
        positionX: 80,
        positionY: 200,
        configuration: { cron: "*/10 * * * *" },
      },
      {
        id: "t1-pinger",
        type: "network.ping",
        positionX: 360,
        positionY: 200,
        configuration: {
          url: "https://httpbin.org/status/200",
          method: "GET",
          timeoutMs: 5000,
          expectedStatus: 200,
          followRedirects: true,
        },
      },
      {
        id: "t1-if",
        type: "logic.if",
        positionX: 660,
        positionY: 200,
        configuration: {
          condition: "input.alive === false || input.latencyMs > 2500",
        },
      },
      {
        id: "t1-alert",
        type: "communication.email",
        positionX: 980,
        positionY: 120,
        configuration: {
          to: "devops@mycompany.com",
          subject: "🚨 High Latency / Outage Alert: {{input.url}}",
          body: "Alert: The keep-alive probe to {{input.url}} detected high latency ({{input.latencyMs}}ms) or downtime at {{input.timestamp}}.",
        },
      },
      {
        id: "t1-log",
        type: "data.text",
        positionX: 980,
        positionY: 280,
        configuration: {
          text: "HEARTBEAT HEALTHY: {{input.url}} responded in {{input.latencyMs}}ms",
          operation: "uppercase",
        },
      },
    ],
    connections: [
      { sourceNode: "t1-schedule", targetNode: "t1-pinger" },
      { sourceNode: "t1-pinger", targetNode: "t1-if" },
      { sourceNode: "t1-if", targetNode: "t1-alert", sourceHandle: "true" },
      { sourceNode: "t1-if", targetNode: "t1-log", sourceHandle: "false" },
    ],
  },
  {
    id: "ai-support-classifier",
    title: "AI Customer Support Auto-Responder & Context Memory",
    category: "AI & Automation",
    badgeColor: "border-purple-500/40 text-purple-400 bg-purple-950/30",
    icon: "🤖",
    description:
      "Captures customer support webhooks, classifies ticket priority with Gemini AI, retains persistent conversational context in Neon PostgreSQL, and routes urgent escalations.",
    estimatedOps: "~3.5k ops/sec",
    nodeTypes: ["Webhook", "AI Prompt", "Switch Router", "Email", "Webhook Respond"],
    nodes: [
      {
        id: "t2-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/support-inbound", method: "POST" },
      },
      {
        id: "t2-ai",
        type: "ai.prompt",
        positionX: 380,
        positionY: 200,
        configuration: {
          prompt:
            "A customer submitted this inquiry: {{input.body.message}}. Classify urgency as URGENT or NORMAL and draft a polite support reply.",
          model: "gemini-2.5-flash",
          rememberHistory: true,
          sessionId: "support-{{input.body.userId}}",
          contextWindow: 5,
        },
      },
      {
        id: "t2-switch",
        type: "logic.switch",
        positionX: 680,
        positionY: 200,
        configuration: {
          value: "{{input.classification}}",
          rules: [
            { value: "URGENT", outputName: "urgent" },
            { value: "NORMAL", outputName: "normal" },
          ],
        },
      },
      {
        id: "t2-escalate",
        type: "communication.email",
        positionX: 980,
        positionY: 120,
        configuration: {
          to: "leads@mycompany.com",
          subject: "🚨 High Priority Support Inquiry",
          body: "Urgent query received: {{input.response}}",
        },
      },
      {
        id: "t2-respond",
        type: "webhook.respond",
        positionX: 980,
        positionY: 280,
        configuration: {
          statusCode: 200,
          respondWith: "json",
          responseBody: '{"status": "processed", "autoReply": "{{input.response}}"}',
        },
      },
    ],
    connections: [
      { sourceNode: "t2-webhook", targetNode: "t2-ai" },
      { sourceNode: "t2-ai", targetNode: "t2-switch" },
      { sourceNode: "t2-switch", targetNode: "t2-escalate" },
      { sourceNode: "t2-switch", targetNode: "t2-respond" },
    ],
  },
  {
    id: "financial-csv-etl",
    title: "E-Commerce CSV Financial ETL & Revenue Aggregator",
    category: "Data & Analytics",
    badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-950/30",
    icon: "📊",
    description:
      "Ingests raw multi-row transactional CSV data, deserializes to structured objects, filters active paid orders, rounds numbers, and computes aggregate gross merchandise value.",
    estimatedOps: "~450k records/sec",
    nodeTypes: ["Manual Trigger", "CSV Parser", "Data Filter", "Math Calculate", "Aggregate"],
    nodes: [
      {
        id: "t3-manual",
        type: "trigger.manual",
        positionX: 80,
        positionY: 200,
        configuration: {},
      },
      {
        id: "t3-csv",
        type: "data.csv",
        positionX: 340,
        positionY: 200,
        configuration: {
          mode: "csvToJson",
          rawCsv:
            "orderId,customer,amount,status\nORD-101,Acme Corp,1250.50,completed\nORD-102,Beta LLC,45.00,refunded\nORD-103,Gamma Inc,3420.00,completed\nORD-104,Delta Co,780.25,completed\nORD-105,Epsilon,95.00,cancelled",
        },
      },
      {
        id: "t3-filter",
        type: "data.filter",
        positionX: 620,
        positionY: 200,
        configuration: {
          field: "status",
          operator: "equals",
          value: "completed",
        },
      },
      {
        id: "t3-math",
        type: "math.calculate",
        positionX: 900,
        positionY: 200,
        configuration: {
          operation: "round",
          valueA: "{{input.amount}}",
        },
      },
      {
        id: "t3-agg",
        type: "logic.aggregate",
        positionX: 1180,
        positionY: 200,
        configuration: {
          operation: "sum",
          property: "amount",
        },
      },
    ],
    connections: [
      { sourceNode: "t3-manual", targetNode: "t3-csv" },
      { sourceNode: "t3-csv", targetNode: "t3-filter" },
      { sourceNode: "t3-filter", targetNode: "t3-math" },
      { sourceNode: "t3-math", targetNode: "t3-agg" },
    ],
  },
  {
    id: "hmac-webhook-verifier",
    title: "Enterprise Webhook HMAC Signature Guard & Relay",
    category: "Security & Webhooks",
    badgeColor: "border-amber-500/40 text-amber-400 bg-amber-950/30",
    icon: "🔐",
    description:
      "Hardened security gateway that accepts incoming webhooks (e.g. Stripe, GitHub), computes cryptographic HMAC-SHA256 signatures, and routes authorized payloads.",
    estimatedOps: "~320k ops/sec",
    nodeTypes: ["Webhook", "Crypto Hash", "IF Branch", "Webhook Respond 200", "Webhook Respond 401"],
    nodes: [
      {
        id: "t4-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/stripe-events", method: "POST" },
      },
      {
        id: "t4-crypto",
        type: "crypto.hash",
        positionX: 360,
        positionY: 200,
        configuration: {
          algorithm: "hmac-sha256",
          secret: "whsec_test_secret_key_12345",
          text: "{{input.body}}",
        },
      },
      {
        id: "t4-if",
        type: "logic.if",
        positionX: 660,
        positionY: 200,
        configuration: {
          condition: "Boolean(input.hash)",
        },
      },
      {
        id: "t4-success",
        type: "webhook.respond",
        positionX: 980,
        positionY: 120,
        configuration: {
          statusCode: 200,
          respondWith: "json",
          responseBody: '{"verified": true, "status": "relayed"}',
        },
      },
      {
        id: "t4-unauthorized",
        type: "webhook.respond",
        positionX: 980,
        positionY: 280,
        configuration: {
          statusCode: 401,
          respondWith: "json",
          responseBody: '{"error": "Unauthorized: Invalid HMAC signature"}',
        },
      },
    ],
    connections: [
      { sourceNode: "t4-webhook", targetNode: "t4-crypto" },
      { sourceNode: "t4-crypto", targetNode: "t4-if" },
      { sourceNode: "t4-if", targetNode: "t4-success", sourceHandle: "true" },
      { sourceNode: "t4-if", targetNode: "t4-unauthorized", sourceHandle: "false" },
    ],
  },
];
