import { NodeExecutor } from "../types";
import manualTrigger from "./manualTrigger";
import webhookTrigger from "./webhookTrigger";
import scheduleTrigger from "./scheduleTrigger";
import httpRequest from "./httpRequest";
import ifNode from "./ifNode";
import setVariable from "./setVariable";
import aiPrompt from "./aiPrompt";
import postgresQuery from "./postgresQuery";
import webhookNotification from "./webhookNotification";
import waitNode from "./waitNode";
import codeNode from "./codeNode";
import pinger from "./pinger";
import switchNode from "./switchNode";
import filterNode from "./filterNode";
import emailNode from "./emailNode";
import webhookRespond from "./webhookRespond";
import csvNode from "./csvNode";
import cryptoNode from "./cryptoNode";
import textNode from "./textNode";
import mathNode from "./mathNode";
import aggregateNode from "./aggregateNode";

export const EXECUTORS: Record<string, NodeExecutor> = {
  // Triggers
  "trigger.manual": manualTrigger,
  "trigger.webhook": webhookTrigger,
  "trigger.schedule": scheduleTrigger,

  // Core Actions & Network
  "http.request": httpRequest,
  "network.ping": pinger,
  "webhook.respond": webhookRespond,

  // AI & Database
  "ai.prompt": aiPrompt,
  "db.postgres": postgresQuery,

  // Communication
  "communication.webhook": webhookNotification,
  "communication.email": emailNode,

  // Logic & Flow Control
  "logic.if": ifNode,
  "logic.switch": switchNode,
  "logic.wait": waitNode,

  // Data Manipulation
  "data.setVariable": setVariable,
  "data.code": codeNode,
  "data.filter": filterNode,
  "data.csv": csvNode,
  "crypto.hash": cryptoNode,
  "data.text": textNode,
  "math.calculate": mathNode,
  "logic.aggregate": aggregateNode,
};

export function getExecutor(nodeType: string): NodeExecutor {
  const executor = EXECUTORS[nodeType];
  if (!executor) {
    throw new Error(`No executor registered for node type "${nodeType}"`);
  }
  return executor;
}
