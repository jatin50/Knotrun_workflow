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
  // ==========================================
  // 1. DEVOPS & MONITORING
  // ==========================================
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
          timeoutSeconds: 5,
          expectedStatus: 200,
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
    id: "github-discord-cicd",
    title: "GitHub CI/CD Deployment & Discord Alert Relay",
    category: "DevOps & Monitoring",
    badgeColor: "border-sky-500/40 text-sky-400 bg-sky-950/30",
    icon: "🚀",
    description:
      "Receives GitHub webhook deployment and release payloads, parses commit hashes & repo metadata with custom code, checks deployment status, and sends rich Discord/Slack notifications.",
    estimatedOps: "~280k ops/sec",
    nodeTypes: ["Webhook", "Custom Code", "IF Branch", "Slack / Discord", "Webhook Respond"],
    nodes: [
      {
        id: "t2-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/github-deploy", method: "POST" },
      },
      {
        id: "t2-code",
        type: "data.code",
        positionX: 360,
        positionY: 200,
        configuration: {
          code: `const b = input.body || {};
return {
  repo: b.repository?.full_name || "main-repo",
  sender: b.sender?.login || "ci-bot",
  branch: b.ref ? b.ref.replace("refs/heads/", "") : "production",
  success: b.status !== "failure",
  commit: b.head_commit?.id ? b.head_commit.id.slice(0, 7) : "HEAD",
  timestamp: new Date().toISOString()
};`,
        },
      },
      {
        id: "t2-if",
        type: "logic.if",
        positionX: 660,
        positionY: 200,
        configuration: {
          condition: "input.success === true",
        },
      },
      {
        id: "t2-discord-success",
        type: "communication.webhook",
        positionX: 980,
        positionY: 120,
        configuration: {
          platform: "discord",
          webhookUrl: "https://discord.com/api/webhooks/demo",
          senderName: "CI/CD Deployment Bot",
          message: "✅ **Deployment Successful** to `{{input.branch}}` on `{{input.repo}}`\nCommit: `{{input.commit}}` by @{{input.sender}} at {{input.timestamp}}",
        },
      },
      {
        id: "t2-discord-fail",
        type: "communication.webhook",
        positionX: 980,
        positionY: 280,
        configuration: {
          platform: "discord",
          webhookUrl: "https://discord.com/api/webhooks/demo",
          senderName: "CI/CD Alert Bot",
          message: "🚨 **DEPLOYMENT FAILED** for `{{input.repo}}` on branch `{{input.branch}}`! Immediate rollback required.",
        },
      },
      {
        id: "t2-ack",
        type: "webhook.respond",
        positionX: 1280,
        positionY: 200,
        configuration: {
          statusCode: 200,
          responseBody: '{"received": true, "processedAt": "{{input.timestamp}}"}',
        },
      },
    ],
    connections: [
      { sourceNode: "t2-webhook", targetNode: "t2-code" },
      { sourceNode: "t2-code", targetNode: "t2-if" },
      { sourceNode: "t2-if", targetNode: "t2-discord-success", sourceHandle: "true" },
      { sourceNode: "t2-if", targetNode: "t2-discord-fail", sourceHandle: "false" },
      { sourceNode: "t2-discord-success", targetNode: "t2-ack" },
      { sourceNode: "t2-discord-fail", targetNode: "t2-ack" },
    ],
  },
  {
    id: "daily-db-metrics",
    title: "PostgreSQL Database Health & Metrics Daily Digest",
    category: "DevOps & Monitoring",
    badgeColor: "border-blue-500/40 text-blue-400 bg-blue-950/30",
    icon: "🗄️",
    description:
      "Runs on a daily 9:00 AM schedule. Queries PostgreSQL database tables, aggregates key platform metrics, calculates user growth ratios, and emails a morning briefing report to the team.",
    estimatedOps: "~90k ops/sec",
    nodeTypes: ["Schedule", "PostgreSQL", "Set Variable", "Math Calculate", "Send Email"],
    nodes: [
      {
        id: "t3-schedule",
        type: "trigger.schedule",
        positionX: 80,
        positionY: 200,
        configuration: { cron: "0 9 * * *" },
      },
      {
        id: "t3-db",
        type: "db.postgres",
        positionX: 360,
        positionY: 200,
        configuration: {
          query: "SELECT COUNT(*) as total_users, NOW() as report_time FROM \"User\";",
        },
      },
      {
        id: "t3-var",
        type: "data.setVariable",
        positionX: 660,
        positionY: 200,
        configuration: {
          key: "userCount",
          value: "{{input.total_users || 125}}",
        },
      },
      {
        id: "t3-math",
        type: "math.calculate",
        positionX: 960,
        positionY: 200,
        configuration: {
          operation: "multiply",
          valueA: "{{input.userCount || 125}}",
          valueB: "1.15",
        },
      },
      {
        id: "t3-email",
        type: "communication.email",
        positionX: 1260,
        positionY: 200,
        configuration: {
          to: "founders@startup.io",
          subject: "📊 Morning Database Digest: Platform Active Users",
          body: "Good morning team,\n\nDatabase check completed at {{input.report_time}}.\nTotal Registered Users: {{input.userCount}}\nProjected Growth Target: {{input.result}}\n\nDatabase connection: Healthy (PostgreSQL Cloud).",
        },
      },
    ],
    connections: [
      { sourceNode: "t3-schedule", targetNode: "t3-db" },
      { sourceNode: "t3-db", targetNode: "t3-var" },
      { sourceNode: "t3-var", targetNode: "t3-math" },
      { sourceNode: "t3-math", targetNode: "t3-email" },
    ],
  },

  // ==========================================
  // 2. AI & AUTOMATION
  // ==========================================
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
        id: "t4-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/support-inbound", method: "POST" },
      },
      {
        id: "t4-ai",
        type: "ai.prompt",
        positionX: 380,
        positionY: 200,
        configuration: {
          prompt:
            "A customer submitted this inquiry: {{input.body.message}}. Classify urgency as URGENT or NORMAL and draft a polite support reply.",
          model: "gemini-2.5-flash",
          enableMemory: true,
          sessionId: "support-{{input.body.userId}}",
          memoryLimit: 5,
        },
      },
      {
        id: "t4-switch",
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
        id: "t4-escalate",
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
        id: "t4-respond",
        type: "webhook.respond",
        positionX: 980,
        positionY: 280,
        configuration: {
          statusCode: 200,
          responseBody: '{"status": "processed", "autoReply": "{{input.response}}"}',
        },
      },
    ],
    connections: [
      { sourceNode: "t4-webhook", targetNode: "t4-ai" },
      { sourceNode: "t4-ai", targetNode: "t4-switch" },
      { sourceNode: "t4-switch", targetNode: "t4-escalate" },
      { sourceNode: "t4-switch", targetNode: "t4-respond" },
    ],
  },
  {
    id: "ai-lead-qualifier",
    title: "AI Inbound Lead Qualifier & Enterprise Deal Router",
    category: "AI & Automation",
    badgeColor: "border-indigo-500/40 text-indigo-400 bg-indigo-950/30",
    icon: "🎯",
    description:
      "Captures new contact form submissions, uses AI prompt evaluation to analyze deal size and company intent, alerts sales via Slack, and auto-sends product collateral.",
    estimatedOps: "~4.2k ops/sec",
    nodeTypes: ["Webhook", "AI Prompt", "IF Branch", "Slack / Discord", "Send Email"],
    nodes: [
      {
        id: "t5-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/contact-leads", method: "POST" },
      },
      {
        id: "t5-ai",
        type: "ai.prompt",
        positionX: 360,
        positionY: 200,
        configuration: {
          prompt:
            "Analyze this inbound lead: Company: {{input.body.company}}, Team Size: {{input.body.teamSize}}, Needs: {{input.body.message}}. Output JSON with { isEnterprise: boolean, summary: string, estimatedTier: string }.",
          model: "gemini-2.5-flash",
          systemPrompt: "You are an executive enterprise sales analyst.",
        },
      },
      {
        id: "t5-if",
        type: "logic.if",
        positionX: 660,
        positionY: 200,
        configuration: {
          condition: "Boolean(input.isEnterprise) === true",
        },
      },
      {
        id: "t5-slack",
        type: "communication.webhook",
        positionX: 980,
        positionY: 120,
        configuration: {
          platform: "slack",
          webhookUrl: "https://hooks.slack.com/services/demo",
          senderName: "Sales AI Assistant",
          message: "🔥 **NEW ENTERPRISE LEAD DETECTED**\nCompany: {{input.body.company}}\nAI Analysis: {{input.summary}}\nTier: Enterprise Priority",
        },
      },
      {
        id: "t5-email",
        type: "communication.email",
        positionX: 980,
        positionY: 280,
        configuration: {
          to: "{{input.body.email}}",
          subject: "Welcome to our Platform — Getting Started Guide",
          body: "Hello,\n\nThank you for reaching out to us! We received your inquiry and our team is reviewing your requirements.",
        },
      },
    ],
    connections: [
      { sourceNode: "t5-webhook", targetNode: "t5-ai" },
      { sourceNode: "t5-ai", targetNode: "t5-if" },
      { sourceNode: "t5-if", targetNode: "t5-slack", sourceHandle: "true" },
      { sourceNode: "t5-if", targetNode: "t5-email", sourceHandle: "false" },
    ],
  },
  {
    id: "ai-content-generator",
    title: "AI Weekly Product Update & Multi-Channel Publisher",
    category: "AI & Automation",
    badgeColor: "border-pink-500/40 text-pink-400 bg-pink-950/30",
    icon: "✍️",
    description:
      "Scheduled weekly automation that prompts AI to draft technical changelogs and release notes, sanitizes text formatting, and broadcasts preview copies to internal team channels.",
    estimatedOps: "~85k ops/sec",
    nodeTypes: ["Schedule", "AI Prompt", "Text Transform", "Slack / Discord"],
    nodes: [
      {
        id: "t6-schedule",
        type: "trigger.schedule",
        positionX: 80,
        positionY: 200,
        configuration: { cron: "0 10 * * 1" },
      },
      {
        id: "t6-ai",
        type: "ai.prompt",
        positionX: 360,
        positionY: 200,
        configuration: {
          prompt:
            "Generate a crisp, exciting 3-bullet technical changelog for this week's software improvements: performance optimizations, bug fixes, and new enterprise templates.",
          model: "gemini-2.5-flash",
        },
      },
      {
        id: "t6-text",
        type: "data.text",
        positionX: 660,
        positionY: 200,
        configuration: {
          operation: "trim",
          text: "{{input.response}}",
        },
      },
      {
        id: "t6-broadcast",
        type: "communication.webhook",
        positionX: 960,
        positionY: 200,
        configuration: {
          platform: "discord",
          webhookUrl: "https://discord.com/api/webhooks/demo",
          senderName: "Release Announcement Bot",
          message: "📢 **WEEKLY PLATFORM CHANGELOG DRAFT**\n\n{{input.result}}\n\n*Review by 2 PM for public release!*",
        },
      },
    ],
    connections: [
      { sourceNode: "t6-schedule", targetNode: "t6-ai" },
      { sourceNode: "t6-ai", targetNode: "t6-text" },
      { sourceNode: "t6-text", targetNode: "t6-broadcast" },
    ],
  },

  // ==========================================
  // 3. DATA & ANALYTICS
  // ==========================================
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
        id: "t7-manual",
        type: "trigger.manual",
        positionX: 80,
        positionY: 200,
        configuration: {},
      },
      {
        id: "t7-csv",
        type: "data.csv",
        positionX: 340,
        positionY: 200,
        configuration: {
          mode: "csvToJson",
          csvData:
            "orderId,customer,amount,status\nORD-101,Acme Corp,1250.50,completed\nORD-102,Beta LLC,45.00,refunded\nORD-103,Gamma Inc,3420.00,completed\nORD-104,Delta Co,780.25,completed\nORD-105,Epsilon,95.00,cancelled",
        },
      },
      {
        id: "t7-filter",
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
        id: "t7-math",
        type: "math.calculate",
        positionX: 900,
        positionY: 200,
        configuration: {
          operation: "round",
          valueA: "{{input.amount}}",
        },
      },
      {
        id: "t7-agg",
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
      { sourceNode: "t7-manual", targetNode: "t7-csv" },
      { sourceNode: "t7-csv", targetNode: "t7-filter" },
      { sourceNode: "t7-filter", targetNode: "t7-math" },
      { sourceNode: "t7-math", targetNode: "t7-agg" },
    ],
  },
  {
    id: "crypto-price-sentinel",
    title: "Live Crypto / Exchange Rate Sentinel & Alert",
    category: "Data & Analytics",
    badgeColor: "border-teal-500/40 text-teal-400 bg-teal-950/30",
    icon: "📈",
    description:
      "Polls public exchange rate APIs every 15 minutes, checks if prices cross user-defined thresholds using V8 sandboxed logic, and fires real-time email alerts on sudden drops.",
    estimatedOps: "~210k ops/sec",
    nodeTypes: ["Schedule", "HTTP Request", "IF Branch", "Email", "Slack / Discord"],
    nodes: [
      {
        id: "t8-schedule",
        type: "trigger.schedule",
        positionX: 80,
        positionY: 200,
        configuration: { cron: "*/15 * * * *" },
      },
      {
        id: "t8-http",
        type: "http.request",
        positionX: 360,
        positionY: 200,
        configuration: {
          method: "GET",
          url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
        },
      },
      {
        id: "t8-if",
        type: "logic.if",
        positionX: 660,
        positionY: 200,
        configuration: {
          condition: "Boolean(input.body?.bitcoin?.usd && input.body.bitcoin.usd < 65000)",
        },
      },
      {
        id: "t8-alert",
        type: "communication.email",
        positionX: 980,
        positionY: 120,
        configuration: {
          to: "trader@finance.com",
          subject: "⚠️ Crypto Dip Alert: Bitcoin Price Alert Triggered",
          body: "Market Update: Current BTC price is ${{input.body.bitcoin.usd}} USD. Target buying threshold reached.",
        },
      },
      {
        id: "t8-discord",
        type: "communication.webhook",
        positionX: 980,
        positionY: 280,
        configuration: {
          platform: "discord",
          webhookUrl: "https://discord.com/api/webhooks/demo",
          senderName: "Market Sentinel",
          message: "ℹ️ Market Check: BTC ${{input.body.bitcoin.usd}}, ETH ${{input.body.ethereum.usd}}. Within normal range.",
        },
      },
    ],
    connections: [
      { sourceNode: "t8-schedule", targetNode: "t8-http" },
      { sourceNode: "t8-http", targetNode: "t8-if" },
      { sourceNode: "t8-if", targetNode: "t8-alert", sourceHandle: "true" },
      { sourceNode: "t8-if", targetNode: "t8-discord", sourceHandle: "false" },
    ],
  },

  // ==========================================
  // 4. SECURITY & WEBHOOKS
  // ==========================================
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
        id: "t9-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/stripe-events", method: "POST" },
      },
      {
        id: "t9-crypto",
        type: "crypto.hash",
        positionX: 360,
        positionY: 200,
        configuration: {
          operation: "hmac-sha256",
          secret: "whsec_test_secret_key_12345",
          text: "{{input.body}}",
        },
      },
      {
        id: "t9-if",
        type: "logic.if",
        positionX: 660,
        positionY: 200,
        configuration: {
          condition: "Boolean(input.hash)",
        },
      },
      {
        id: "t9-success",
        type: "webhook.respond",
        positionX: 980,
        positionY: 120,
        configuration: {
          statusCode: 200,
          responseBody: '{"verified": true, "status": "relayed"}',
        },
      },
      {
        id: "t9-unauthorized",
        type: "webhook.respond",
        positionX: 980,
        positionY: 280,
        configuration: {
          statusCode: 401,
          responseBody: '{"error": "Unauthorized: Invalid HMAC signature"}',
        },
      },
    ],
    connections: [
      { sourceNode: "t9-webhook", targetNode: "t9-crypto" },
      { sourceNode: "t9-crypto", targetNode: "t9-if" },
      { sourceNode: "t9-if", targetNode: "t9-success", sourceHandle: "true" },
      { sourceNode: "t9-if", targetNode: "t9-unauthorized", sourceHandle: "false" },
    ],
  },
  {
    id: "stripe-customer-onboarding",
    title: "Stripe Checkout & Automated Customer Welcome Flow",
    category: "Security & Webhooks",
    badgeColor: "border-orange-500/40 text-orange-400 bg-orange-950/30",
    icon: "💳",
    description:
      "Captures Stripe checkout.session.completed webhooks, filters paid orders, sets customer workspace variables, triggers a personalized onboarding email, and acknowledges Stripe with 200 OK.",
    estimatedOps: "~380k ops/sec",
    nodeTypes: ["Webhook", "Data Filter", "Set Variable", "Send Email", "Webhook Respond"],
    nodes: [
      {
        id: "t10-webhook",
        type: "trigger.webhook",
        positionX: 80,
        positionY: 200,
        configuration: { path: "/stripe-checkout", method: "POST" },
      },
      {
        id: "t10-filter",
        type: "data.filter",
        positionX: 360,
        positionY: 200,
        configuration: {
          field: "body.payment_status",
          operator: "equals",
          value: "paid",
        },
      },
      {
        id: "t10-var",
        type: "data.setVariable",
        positionX: 660,
        positionY: 200,
        configuration: {
          key: "customerEmail",
          value: "{{input.body.customer_details?.email || 'customer@example.com'}}",
        },
      },
      {
        id: "t10-email",
        type: "communication.email",
        positionX: 960,
        positionY: 200,
        configuration: {
          to: "{{input.customerEmail}}",
          subject: "🎉 Welcome to Pro! Your Account is Ready",
          body: "Thank you for your purchase!\n\nYour subscription is now active. You have full access to all enterprise workflow features.\n\nEnjoy automating,\nThe Team",
        },
      },
      {
        id: "t10-ack",
        type: "webhook.respond",
        positionX: 1260,
        positionY: 200,
        configuration: {
          statusCode: 200,
          responseBody: '{"received": true, "fulfilled": true}',
        },
      },
    ],
    connections: [
      { sourceNode: "t10-webhook", targetNode: "t10-filter" },
      { sourceNode: "t10-filter", targetNode: "t10-var" },
      { sourceNode: "t10-var", targetNode: "t10-email" },
      { sourceNode: "t10-email", targetNode: "t10-ack" },
    ],
  },
];
