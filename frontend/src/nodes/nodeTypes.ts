export type NodeConfig = Record<string, unknown>;

export interface NodeTypeDef {
  type: string; // stored in Node.type, e.g. "trigger.manual"
  label: string;
  category: "trigger" | "logic" | "action" | "data" | "ai" | "database" | "communication";
  color: string; // tailwind color name used for the node's accent
  hasInput: boolean; // whether it accepts an incoming connection
  defaultConfig: NodeConfig;
  summarize: (config: NodeConfig) => string;
}

export const NODE_TYPES: NodeTypeDef[] = [
  // --- TRIGGERS ---
  {
    type: "trigger.manual",
    label: "Manual Trigger",
    category: "trigger",
    color: "emerald",
    hasInput: false,
    defaultConfig: {},
    summarize: () => "Starts the workflow manually",
  },
  {
    type: "trigger.webhook",
    label: "Webhook",
    category: "trigger",
    color: "teal",
    hasInput: false,
    defaultConfig: {},
    summarize: () => "Starts via an incoming HTTP request",
  },
  {
    type: "trigger.schedule",
    label: "Schedule",
    category: "trigger",
    color: "purple",
    hasInput: false,
    defaultConfig: { cron: "*/5 * * * *" },
    summarize: (c) => `Runs on: ${(c.cron as string) || "(no schedule set)"}`,
  },

  // --- ACTIONS & NETWORK ---
  {
    type: "http.request",
    label: "HTTP Request",
    category: "action",
    color: "indigo",
    hasInput: true,
    defaultConfig: { method: "GET", url: "", credentialId: "", body: "" },
    summarize: (c) =>
      `${(c.method as string) || "GET"} ${(c.url as string) || "(no URL set)"}${c.credentialId ? " [Cred]" : ""}`,
  },
  {
    type: "network.ping",
    label: "Website Pinger",
    category: "action",
    color: "lime",
    hasInput: true,
    defaultConfig: {
      url: "https://",
      method: "GET",
      timeoutSeconds: 10,
      expectedStatus: 200,
    },
    summarize: (c) =>
      `Ping ${(c.url as string) || "(no URL)"}`,
  },
  {
    type: "webhook.respond",
    label: "Respond to Webhook",
    category: "action",
    color: "orange",
    hasInput: true,
    defaultConfig: {
      statusCode: 200,
      responseBody: '{\n  "success": true,\n  "data": "{{ input }}"\n}',
    },
    summarize: (c) => `HTTP ${c.statusCode ?? 200} response`,
  },

  // --- AI ---
  {
    type: "ai.prompt",
    label: "AI Prompt",
    category: "ai",
    color: "violet",
    hasInput: true,
    defaultConfig: {
      provider: "openai",
      model: "gpt-4o-mini",
      prompt: "Summarize this data: {{ input }}",
      systemPrompt: "You are a helpful AI automation assistant.",
      credentialId: "",
      enableMemory: false,
      sessionId: "{{ input.sessionId || 'default' }}",
      memoryLimit: 10,
    },
    summarize: (c) =>
      `${(c.provider as string) || "AI"}: ${(c.model as string) || "model"}${c.enableMemory ? " [Memory]" : ""}`,
  },

  // --- DATABASE ---
  {
    type: "db.postgres",
    label: "PostgreSQL",
    category: "database",
    color: "blue",
    hasInput: true,
    defaultConfig: { query: "SELECT NOW();" },
    summarize: (c) =>
      (c.query as string) ? (c.query as string).slice(0, 24) + "..." : "No query set",
  },

  // --- COMMUNICATION ---
  {
    type: "communication.webhook",
    label: "Slack / Discord",
    category: "communication",
    color: "pink",
    hasInput: true,
    defaultConfig: {
      platform: "slack",
      webhookUrl: "",
      message: "Hello from workflow!\nData: {{ input }}",
      senderName: "Workflow Bot",
      credentialId: "",
    },
    summarize: (c) =>
      `Notify ${(c.platform as string) || "Webhook"}`,
  },
  {
    type: "communication.email",
    label: "Send Email",
    category: "communication",
    color: "rose",
    hasInput: true,
    defaultConfig: {
      to: "",
      from: "noreply@automation.local",
      subject: "Workflow Alert: {{ input.title || 'Notification' }}",
      body: "<p>New workflow trigger received.</p>",
      credentialId: "",
    },
    summarize: (c) =>
      c.to ? `To: ${c.to}` : "No recipient set",
  },

  // --- LOGIC & FLOW CONTROL ---
  {
    type: "logic.if",
    label: "IF",
    category: "logic",
    color: "amber",
    hasInput: true,
    defaultConfig: { condition: "" },
    summarize: (c) => (c.condition ? `if ${c.condition}` : "No condition set"),
  },
  {
    type: "logic.switch",
    label: "Switch Router",
    category: "logic",
    color: "amber",
    hasInput: true,
    defaultConfig: {
      value: "{{ input.status }}",
      rules: [
        { value: "approved", outputName: "approved" },
        { value: "rejected", outputName: "rejected" },
      ],
      defaultOutput: "default",
    },
    summarize: (c) => `Switch on ${c.value || "input"}`,
  },
  {
    type: "logic.wait",
    label: "Wait / Delay",
    category: "logic",
    color: "amber",
    hasInput: true,
    defaultConfig: { seconds: 2 },
    summarize: (c) => `Wait ${c.seconds ?? 2}s`,
  },
  {
    type: "data.filter",
    label: "Filter Data",
    category: "logic",
    color: "teal",
    hasInput: true,
    defaultConfig: {
      field: "status",
      operator: "equals",
      value: "active",
    },
    summarize: (c) => `${c.field || "value"} ${c.operator || "=="} ${c.value || "''"}`,
  },

  // --- DATA & TRANSFORMATION ---
  {
    type: "data.setVariable",
    label: "Set Variable",
    category: "data",
    color: "sky",
    hasInput: true,
    defaultConfig: { key: "", value: "" },
    summarize: (c) => (c.key ? `${c.key} = ${c.value ?? ""}` : "No variable set"),
  },
  {
    type: "data.code",
    label: "Custom Code",
    category: "data",
    color: "cyan",
    hasInput: true,
    defaultConfig: {
      code: "// Transform or compute input data\nreturn {\n  ...input,\n  timestamp: new Date().toISOString()\n};",
    },
    summarize: () => "JavaScript custom logic",
  },
  {
    type: "data.csv",
    label: "CSV Converter",
    category: "data",
    color: "emerald",
    hasInput: true,
    defaultConfig: {
      mode: "jsonToCsv",
      csvData: "",
    },
    summarize: (c) => (c.mode === "csvToJson" ? "CSV -> JSON" : "JSON -> CSV"),
  },
  {
    type: "crypto.hash",
    label: "Crypto & Hashes",
    category: "data",
    color: "fuchsia",
    hasInput: true,
    defaultConfig: {
      operation: "sha256",
      text: "{{ input.data || input }}",
      secret: "",
    },
    summarize: (c) => `${c.operation || "sha256"} hash`,
  },
  {
    type: "data.text",
    label: "Text Operations",
    category: "data",
    color: "sky",
    hasInput: true,
    defaultConfig: {
      operation: "trim",
      text: "{{ input.text || input }}",
      pattern: "",
      replacement: "",
    },
    summarize: (c) => `Text: ${c.operation || "transform"}`,
  },
  {
    type: "math.calculate",
    label: "Math Operations",
    category: "data",
    color: "blue",
    hasInput: true,
    defaultConfig: {
      operation: "add",
      valueA: "{{ input.price || 0 }}",
      valueB: "10",
    },
    summarize: (c) => `Math: ${c.operation || "add"}`,
  },
  {
    type: "logic.aggregate",
    label: "Data Aggregator",
    category: "data",
    color: "purple",
    hasInput: true,
    defaultConfig: {
      operation: "sum",
      property: "amount",
      separator: ", ",
    },
    summarize: (c) => `Aggregate: ${c.operation || "sum"}`,
  },
];

export function getNodeTypeDef(type: string): NodeTypeDef {
  const found = NODE_TYPES.find((n) => n.type === type);
  if (found) return found;
  return {
    type,
    label: type || "Unknown Node",
    category: "action",
    color: "indigo",
    hasInput: true,
    defaultConfig: {},
    summarize: () => type,
  };
}
