import { useCallback, useEffect, useState, type DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { fetchGraph, saveGraph, type ApiNode, type ApiConnection } from "../lib/graph.api";
import { fetchWorkflow, updateWorkflow } from "../lib/workflow.api";
import { testWorkflow, type TestRunResult } from "../lib/execution.api";
import { startWorkflowExecution } from "../lib/executionHistory.api";
import { fetchTriggers } from "../lib/trigger.api";
import { fetchWorkflowCredentials } from "../lib/credential.api";
import { getNodeTypeDef, type NodeConfig } from "../nodes/nodeTypes";
import WorkflowNode, { type WorkflowNodeData } from "../components/WorkFlow";
import NodePalette from "../components/NodePalette";
import NodeConfigPanel from "../components/NodeConfigPanel";
import TestResultsPanel from "../components/TestResultsPanel";

const nodeTypes = { workflowNode: WorkflowNode };

function apiNodeToFlowNode(n: ApiNode): Node {
  return {
    id: n.id,
    type: "workflowNode",
    position: { x: n.positionX, y: n.positionY },
    data: { nodeType: n.type, configuration: n.configuration } as WorkflowNodeData,
  };
}

function apiConnectionToEdge(c: ApiConnection, index: number): Edge {
  return {
    id: c.id ?? `edge-${index}-${c.sourceNode}-${c.targetNode}`,
    source: c.sourceNode,
    target: c.targetNode,
    sourceHandle: c.sourceHandle ?? undefined,
    targetHandle: c.targetHandle ?? undefined,
  };
}

function EditorCanvas({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["graph", workflowId],
    queryFn: () => fetchGraph(workflowId),
  });

  const { data: triggers } = useQuery({
    queryKey: ["triggers", workflowId],
    queryFn: () => fetchTriggers(workflowId),
  });

  const { data: credentials } = useQuery({
    queryKey: ["workflow-credentials", workflowId],
    queryFn: () => fetchWorkflowCredentials(workflowId),
  });

  const { data: workflow } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => fetchWorkflow(workflowId),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (active: boolean) => updateWorkflow(workflowId, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  // Sync server data into React Flow's own state exactly once per load —
  // after that, the canvas owns the state until the next explicit Save.
  useEffect(() => {
    if (data && !loadedOnce) {
      setNodes(data.nodes.map(apiNodeToFlowNode));
      setEdges(data.connections.map(apiConnectionToEdge));
      setLoadedOnce(true);
    }
  }, [data, loadedOnce, setNodes, setEdges]);

  function buildGraphPayload() {
    const apiNodes: ApiNode[] = nodes.map((n) => ({
      id: n.id,
      type: (n.data as unknown as WorkflowNodeData).nodeType,
      positionX: n.position.x,
      positionY: n.position.y,
      configuration: (n.data as unknown as WorkflowNodeData).configuration ?? {},
    }));
    const apiConnections: ApiConnection[] = edges.map((e) => ({
      sourceNode: e.source,
      targetNode: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));
    return { apiNodes, apiConnections };
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const { apiNodes, apiConnections } = buildGraphPayload();
      return saveGraph(workflowId, apiNodes, apiConnections);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["triggers", workflowId] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { apiNodes, apiConnections } = buildGraphPayload();
      await saveGraph(workflowId, apiNodes, apiConnections);
      return testWorkflow(workflowId);
    },
    onSuccess: (result) => {
      setTestResult(result);
      queryClient.invalidateQueries({ queryKey: ["graph", workflowId] });
    },
  });

  const queueRunMutation = useMutation({
    mutationFn: async () => {
      const { apiNodes, apiConnections } = buildGraphPayload();
      await saveGraph(workflowId, apiNodes, apiConnections);
      return startWorkflowExecution(workflowId);
    },
    onSuccess: (data) => {
      setRunMessage(`Queued execution #${data.id.slice(-6)}`);
      setTimeout(() => setRunMessage(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["executions", workflowId] });
    },
  });

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/workflow-node-type");
      if (!nodeType) return;

      const def = getNodeTypeDef(nodeType);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const newNode: Node = {
        id: crypto.randomUUID(),
        type: "workflowNode",
        position,
        data: { nodeType, configuration: { ...def.defaultConfig } } as WorkflowNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeTrigger = triggers?.find((t) => t.nodeId === selectedNodeId);

  function updateSelectedNodeConfig(configuration: NodeConfig) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...(n.data as object), configuration } as WorkflowNodeData }
          : n
      )
    );
  }

  function deleteSelectedNode() {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading workflow...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link to=".." relative="path" className="text-sm text-slate-500 hover:text-slate-300">
            &larr; Back to workspace
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold text-slate-200 truncate max-w-xs">
              {workflow?.name ?? "Workflow"}
            </h1>
            {workflow && (
              <button
                type="button"
                onClick={() => toggleActiveMutation.mutate(!workflow.active)}
                disabled={toggleActiveMutation.isPending}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${
                  workflow.active
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/60"
                    : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700"
                }`}
                title="Toggle active status (webhooks only trigger active workflows)"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    workflow.active ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                  }`}
                />
                {workflow.active ? "Active" : "Inactive"}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {runMessage && (
            <span className="text-xs text-indigo-400 animate-pulse">{runMessage}</span>
          )}
          {saveMutation.isSuccess && (
            <span className="text-xs text-emerald-400">Saved</span>
          )}
          {saveMutation.isError && (
            <span className="text-xs text-red-400">Save failed</span>
          )}
          <Link
            to={`/workflows/${workflowId}/executions`}
            className="text-sm text-slate-400 hover:text-slate-200 transition px-2 py-1 rounded hover:bg-slate-800"
          >
            Executions &rarr;
          </Link>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-md px-3 py-1.5 text-sm font-medium transition"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || nodes.length === 0}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 rounded-md px-3 py-1.5 text-sm font-medium transition"
            title="Run synchronously in-process and view output"
          >
            {testMutation.isPending ? "Testing..." : "Test (Sync)"}
          </button>
          <button
            onClick={() => queueRunMutation.mutate()}
            disabled={queueRunMutation.isPending || nodes.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md px-3.5 py-1.5 text-sm font-medium transition shadow-sm"
            title="Dispatch execution to BullMQ worker queue"
          >
            {queueRunMutation.isPending ? "Queueing..." : "Run (Queue)"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <NodePalette />

        <div className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            colorMode="dark"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selectedNode && (
          <NodeConfigPanel
            nodeType={(selectedNode.data as unknown as WorkflowNodeData).nodeType}
            configuration={(selectedNode.data as unknown as WorkflowNodeData).configuration ?? {}}
            onChange={updateSelectedNodeConfig}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
            webhookUrl={selectedNodeTrigger?.webhookUrl}
            credentials={credentials}
          />
        )}
      </div>

      {testResult && (
        <TestResultsPanel result={testResult} onClose={() => setTestResult(null)} />
      )}
    </div>
  );
}

function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  if (!workflowId) return null;

  return (
    <ReactFlowProvider>
      <EditorCanvas workflowId={workflowId} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditorPage;
