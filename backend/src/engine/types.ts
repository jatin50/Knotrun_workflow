// Shared, mutable across a single workflow run — Set Variable nodes write
// to it, any downstream node can read from it via context.variables.
export interface ExecutionContext {
  variables: Record<string, unknown>;
}

export type NodeExecutor = (
  config: Record<string, unknown>,
  input: unknown,
  context: ExecutionContext
) => Promise<unknown>;

export type NodeStatus = "success" | "failed" | "skipped";

export interface NodeExecutionResult {
  nodeId: string;
  type: string;
  status: NodeStatus;
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface EngineNode {
  id: string;
  type: string;
  configuration: Record<string, unknown>;
}

export interface EngineConnection {
  sourceNode: string;
  targetNode: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}
