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

  // --- ACTIONS & HTTP ---
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
    },
    summarize: (c) =>
      `${(c.provider as string) || "AI"}: ${(c.model as string) || "model"}`,
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

  // --- LOGIC ---
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
    type: "logic.wait",
    label: "Wait / Delay",
    category: "logic",
    color: "amber",
    hasInput: true,
    defaultConfig: { seconds: 2 },
    summarize: (c) => `Wait ${c.seconds ?? 2}s`,
  },

  // --- DATA & CODE ---
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
