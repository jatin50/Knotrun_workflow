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

export const EXECUTORS: Record<string, NodeExecutor> = {
  "trigger.manual": manualTrigger,
  "trigger.webhook": webhookTrigger,
  "trigger.schedule": scheduleTrigger,
  "http.request": httpRequest,
  "logic.if": ifNode,
  "data.setVariable": setVariable,
  "ai.prompt": aiPrompt,
  "db.postgres": postgresQuery,
  "communication.webhook": webhookNotification,
  "logic.wait": waitNode,
  "data.code": codeNode,
};

export function getExecutor(nodeType: string): NodeExecutor {
  const executor = EXECUTORS[nodeType];
  if (!executor) {
    throw new Error(`No executor registered for node type "${nodeType}"`);
  }
  return executor;
}
