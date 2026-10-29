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
import { SEOHead } from "../components/SEOHead";
import { KnotrunLogo } from "../components/KnotrunLogo";
import TemplateGalleryModal from "../components/TemplateGalleryModal";
import { instantiateTemplate, type WorkflowTemplate } from "../templates/workflowTemplates";

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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);

  // Deleted nodes trash stack for Ctrl+Z recovery (only recovers deleted nodes without reverting added nodes)
  const [deletedTrash, setDeletedTrash] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleRestoreDeletedNode = useCallback(() => {
    if (deletedTrash.length === 0) {
      setRunMessage("No deleted nodes to restore.");
      setTimeout(() => setRunMessage(null), 2000);
      return;
    }

    const last = deletedTrash[deletedTrash.length - 1];
    setDeletedTrash((prev) => prev.slice(0, prev.length - 1));

    // Restore deleted nodes without touching or deleting any newly added nodes
    setNodes((currentNodes) => {
      const existingIds = new Set(currentNodes.map((n) => n.id));
      const nodesToRestore = last.nodes.filter((n) => !existingIds.has(n.id));
      return [...currentNodes, ...nodesToRestore];
    });

    // Restore connected edges
    setEdges((currentEdges) => {
      const existingEdgeIds = new Set(currentEdges.map((e) => e.id));
      const edgesToRestore = last.edges.filter((e) => !existingEdgeIds.has(e.id));
      return [...currentEdges, ...edgesToRestore];
    });

    setHasUnsavedChanges(true);
    const count = last.nodes.length;
    setRunMessage(`Restored ${count} deleted node${count > 1 ? "s" : ""} (Ctrl+Z)`);
    setTimeout(() => setRunMessage(null), 2500);
  }, [deletedTrash, setNodes, setEdges]);

  // Global Ctrl+Z keyboard shortcut: restores accidentally deleted nodes
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleRestoreDeletedNode();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRestoreDeletedNode]);

  // Warn if leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function handleLoadTemplateInEditor(template: WorkflowTemplate) {
    setLoadingTemplateId(template.id);
    try {
      const { nodes: freshNodes, connections: freshConnections } = instantiateTemplate(template);
      const flowNodes = freshNodes.map(apiNodeToFlowNode);
      const flowEdges = freshConnections.map((c, i) => apiConnectionToEdge(c, i));
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNodeId(null);
      setRunMessage(`Loaded "${template.title}" template!`);
      setIsTemplateModalOpen(false);
      await saveGraph(workflowId, freshNodes, freshConnections);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["graph", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["triggers", workflowId] });
    } catch (err) {
      alert("Failed to load template: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoadingTemplateId(null);
    }
  }

  const { data, isLoading, isError } = useQuery({
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
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["graph", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["triggers", workflowId] });
      setRunMessage("Saved successfully!");
      setTimeout(() => setRunMessage(null), 2500);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Save failed";
      setRunMessage(`Save error: ${msg}`);
      setTimeout(() => setRunMessage(null), 5000);
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
      const statusMap = new Map(result.results.map((r) => [r.nodeId, r]));
      setNodes((nds) =>
        nds.map((node) => {
          const res = statusMap.get(node.id);
          if (res) {
            return {
              ...node,
              data: {
                ...(node.data as object),
                executionStatus: res.status,
                executionDuration: res.durationMs,
                executionError: res.error,
              } as WorkflowNodeData,
            };
          }
          return node;
        })
      );
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
    (connection: Connection) => {
      setHasUnsavedChanges(true);
      setEdges((eds) => addEdge(connection, eds));
    },
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

      setHasUnsavedChanges(true);
      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeTrigger = triggers?.find((t) => t.nodeId === selectedNodeId);

  function updateSelectedNodeConfig(configuration: NodeConfig) {
    setHasUnsavedChanges(true);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...(n.data as object), configuration } as WorkflowNodeData }
          : n
      )
    );
  }

  function deleteSelectedNode() {
    const targetNode = nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode) return;

    const connectedEdges = edges.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );

    setDeletedTrash((prev) => [...prev.slice(-25), { nodes: [targetNode], edges: connectedEdges }]);
    setHasUnsavedChanges(true);
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setRunMessage("Node deleted. Press Ctrl+Z to restore.");
    setTimeout(() => setRunMessage(null), 3000);
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading workflow...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl text-rose-400">
          ⚠️
        </div>
        <p className="text-sm font-medium">Failed to load workflow graph.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["graph", workflowId] })}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow"
        >
          Retry
        </button>
      </div>
    );
  }

  function handleNavigateLink(e: React.MouseEvent) {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave without saving?")) {
        e.preventDefault();
      }
    }
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden">
      <SEOHead
        title={`${workflow?.name ?? "Workflow Editor"} | Knotrun Studio`}
        description={`Interactive visual DAG canvas for ${workflow?.name ?? "workflow"}. Assemble nodes, configure triggers, and test execution.`}
        canonicalUrl={`https://studio.knotrun.io/workflows/${workflowId}`}
      />
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" title="Knotrun Studio" className="flex items-center">
            <KnotrunLogo variant="icon" size="xs" />
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <Link
            to=".."
            relative="path"
            onClick={handleNavigateLink}
            className="text-xs font-mono text-slate-400 hover:text-white transition"
          >
            &larr; Workspaces
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
                    workflow.active ? "bg-emerald-400" : "bg-slate-500"
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
          <Link
            to={`/workflows/${workflowId}/executions`}
            onClick={handleNavigateLink}
            className="text-sm text-slate-400 hover:text-slate-200 transition px-2 py-1 rounded hover:bg-slate-800"
          >
            Executions &rarr;
          </Link>
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md transition"
            title="Browse and load pre-built enterprise workflow templates"
          >
            <span>Templates</span>
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 rounded-md px-3 py-1.5 text-sm font-medium transition"
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

      <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
        <NodePalette />

        <div
          className="flex-1 h-full w-full relative min-w-0 min-h-0"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={(deletedNodes) => {
              if (!deletedNodes || deletedNodes.length === 0) return;
              const deletedIds = new Set(deletedNodes.map((n) => n.id));
              const connectedEdges = edges.filter(
                (e) => deletedIds.has(e.source) || deletedIds.has(e.target)
              );
              setDeletedTrash((prev) => [
                ...prev.slice(-25),
                { nodes: deletedNodes, edges: connectedEdges },
              ]);
              setHasUnsavedChanges(true);
              setRunMessage("Node deleted. Press Ctrl+Z to restore.");
              setTimeout(() => setRunMessage(null), 3000);
            }}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            colorMode="dark"
            style={{ width: "100%", height: "100%" }}
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
        <div className="shrink-0 w-full">
          <TestResultsPanel
            result={testResult}
            onClose={() => {
              setTestResult(null);
              setNodes((nds) =>
                nds.map((node) => ({
                  ...node,
                  data: {
                    ...(node.data as object),
                    executionStatus: undefined,
                    executionDuration: undefined,
                    executionError: undefined,
                  } as WorkflowNodeData,
                }))
              );
            }}
          />
        </div>
      )}

      <TemplateGalleryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleLoadTemplateInEditor}
        loadingTemplateId={loadingTemplateId}
      />
    </div>
  );
}

function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  if (!workflowId) return null;

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ReactFlowProvider>
        <EditorCanvas workflowId={workflowId} />
      </ReactFlowProvider>
    </div>
  );
}

export default WorkflowEditorPage;
