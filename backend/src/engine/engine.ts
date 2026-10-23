import { getExecutor } from "./executors";
import {
  EngineNode,
  EngineConnection,
  ExecutionContext,
  NodeExecutionResult,
} from "./types";

// Kahn's algorithm — produces a run order where every node comes after all
// of its upstream dependencies, and throws if the graph has a cycle
// (a workflow can't meaningfully "run" if A depends on B depends on A).
function topologicalSort(nodes: EngineNode[], connections: EngineConnection[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const conn of connections) {
    if (!adjacency.has(conn.sourceNode) || !inDegree.has(conn.targetNode)) continue;
    adjacency.get(conn.sourceNode)!.push(conn.targetNode);
    inDegree.set(conn.targetNode, (inDegree.get(conn.targetNode) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const next of adjacency.get(current) ?? []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  if (order.length !== nodes.length) {
    throw new Error("Workflow contains a cycle and cannot be executed");
  }

  return order;
}

export async function runWorkflowTest(
  nodes: EngineNode[],
  connections: EngineConnection[],
  triggerOverrides?: Record<string, unknown>
): Promise<{ status: "success" | "failed"; results: NodeExecutionResult[] }> {
  const order = topologicalSort(nodes, connections);
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const outputs = new Map<string, unknown>();
  const failedOrSkipped = new Set<string>();
  const results: NodeExecutionResult[] = [];
  const context: ExecutionContext = { variables: {} };

  // Set of connections that have been disabled due to conditional branching (e.g. IF condition)
  const disabledConnections = new Set<EngineConnection>();

  // Map of incoming connections for each node
  const incomingConnections = new Map<string, EngineConnection[]>();
  for (const conn of connections) {
    if (!incomingConnections.has(conn.targetNode)) incomingConnections.set(conn.targetNode, []);
    incomingConnections.get(conn.targetNode)!.push(conn);
  }

  // Map of outgoing connections for each node
  const outgoingConnections = new Map<string, EngineConnection[]>();
  for (const conn of connections) {
    if (!outgoingConnections.has(conn.sourceNode)) outgoingConnections.set(conn.sourceNode, []);
    outgoingConnections.get(conn.sourceNode)!.push(conn);
  }

  let overallStatus: "success" | "failed" = "success";

  for (const nodeId of order) {
    const node = nodesById.get(nodeId)!;
    const incoming = incomingConnections.get(nodeId) ?? [];

    const hasIncoming = incoming.length > 0;
    const activeIncoming = incoming.filter(
      (c) => !disabledConnections.has(c) && !failedOrSkipped.has(c.sourceNode)
    );

    // If node has incoming connections and NONE of them are active/successful, skip it
    if (hasIncoming && activeIncoming.length === 0) {
      failedOrSkipped.add(nodeId);
      for (const outConn of outgoingConnections.get(nodeId) ?? []) {
        disabledConnections.add(outConn);
      }
      results.push({ nodeId, type: node.type, status: "skipped", durationMs: 0 });
      continue;
    }

    // Collect inputs from active upstream connections
    const inputs = activeIncoming.map((conn) => {
      const out = outputs.get(conn.sourceNode);
      const sourceNode = nodesById.get(conn.sourceNode);
      // For IF nodes, unwrap and pass the item payload if present
      if (
        sourceNode?.type === "logic.if" &&
        out &&
        typeof out === "object" &&
        "input" in (out as Record<string, unknown>)
      ) {
        return (out as { input: unknown }).input;
      }
      return out;
    });

    const input =
      inputs.length === 0 ? null : inputs.length === 1 ? inputs[0] : inputs;

    const startedAt = Date.now();
    try {
      const hasOverride = triggerOverrides && nodeId in triggerOverrides;
      const output = hasOverride
        ? triggerOverrides![nodeId]
        : await getExecutor(node.type)(node.configuration, input, context);

      outputs.set(nodeId, output);

      // Handle conditional branching for IF node
      if (
        node.type === "logic.if" &&
        output &&
        typeof output === "object" &&
        "result" in (output as Record<string, unknown>)
      ) {
        const isTrue = Boolean((output as { result: unknown }).result);
        const nodeOutgoing = outgoingConnections.get(nodeId) ?? [];
        for (const outConn of nodeOutgoing) {
          if (isTrue && outConn.sourceHandle === "false") {
            disabledConnections.add(outConn);
          } else if (!isTrue && outConn.sourceHandle === "true") {
            disabledConnections.add(outConn);
          }
        }
      }

      results.push({
        nodeId,
        type: node.type,
        status: "success",
        output,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      failedOrSkipped.add(nodeId);
      for (const outConn of outgoingConnections.get(nodeId) ?? []) {
        disabledConnections.add(outConn);
      }
      overallStatus = "failed";
      results.push({
        nodeId,
        type: node.type,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        durationMs: Date.now() - startedAt,
      });
    }
  }

  return { status: overallStatus, results };
}
