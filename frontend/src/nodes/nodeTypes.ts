export type NodeConfig = Record<string, unknown>;

export interface NodeTypeDef {
  type: string; // stored in Node.type, e.g. "trigger.manual"
  label: string;
  category: "trigger" | "logic" | "action" | "data";
  color: string; // tailwind color name used for the node's accent
  hasInput: boolean; // whether it accepts an incoming connection
  defaultConfig: NodeConfig;
  summarize: (config: NodeConfig) => string;
}

export const NODE_TYPES: NodeTypeDef[] = [
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
  {
    type: "http.request",
    label: "HTTP Request",
    category: "action",
    color: "indigo",
    hasInput: true,
    defaultConfig: { method: "GET", url: "", credentialId: "" },
    summarize: (c) =>
      `${(c.method as string) || "GET"} ${(c.url as string) || "(no URL set)"}${c.credentialId ? " [Cred]" : ""}`,
  },
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
    type: "data.setVariable",
    label: "Set Variable",
    category: "data",
    color: "sky",
    hasInput: true,
    defaultConfig: { key: "", value: "" },
    summarize: (c) => (c.key ? `${c.key} = ${c.value ?? ""}` : "No variable set"),
  },
];

export function getNodeTypeDef(type: string): NodeTypeDef {
  return NODE_TYPES.find((n) => n.type === type) ?? NODE_TYPES[0];
}
