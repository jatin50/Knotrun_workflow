import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startWorkflowExecution,
  fetchExecutions,
  fetchExecutionLogs,
  type Execution,
  type ExecutionStatus,
} from "../lib/executionHistory.api";
import { fetchWorkflow } from "../lib/workflow.api";
import { getNodeTypeDef } from "../nodes/nodeTypes";

const STATUS_CLASSES: Record<ExecutionStatus, string> = {
  PENDING: "text-slate-400 bg-slate-800 border-slate-700",
  RUNNING: "text-indigo-300 bg-indigo-950/80 border-indigo-800 animate-pulse",
  SUCCESS: "text-emerald-300 bg-emerald-950/80 border-emerald-800",
  FAILED: "text-rose-300 bg-rose-950/80 border-rose-800",
  CANCELLED: "text-slate-400 bg-slate-800 border-slate-700",
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function ExecutionRow({ execution }: { execution: Execution }) {
  const [expanded, setExpanded] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["execution-logs", execution.id],
    queryFn: () => fetchExecutionLogs(execution.id),
    enabled: expanded,
  });

  let parsedLogs: Array<{
    nodeId: string;
    type: string;
    status: string;
    error?: string;
    durationMs: number;
  }> = [];
  try {
    parsedLogs = execution.logs ? JSON.parse(execution.logs) : [];
  } catch {
    // logs may hold a plain error string instead of JSON (structural
    // failures like a cycle) — that's fine, we just skip the per-node table.
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition hover:border-slate-700">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${STATUS_CLASSES[execution.status]}`}
          >
            {execution.status}
          </span>
          <span className="text-xs text-slate-400">
            {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : "Queued"}
          </span>
          <span className="text-[11px] text-slate-600 font-mono">#{execution.id.slice(-6)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">{formatDuration(execution.duration)}</span>
          <span className="text-slate-500 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3 bg-slate-950/40">
          {parsedLogs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pipeline Steps</p>
              <div className="space-y-1">
                {parsedLogs.map((r) => (
                  <div key={r.nodeId} className="text-xs flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                    <span className="text-slate-300 font-medium">{getNodeTypeDef(r.type).label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">{r.durationMs}ms</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                          r.status === "success"
                            ? "text-emerald-400 bg-emerald-950/60"
                            : r.status === "failed"
                              ? "text-rose-400 bg-rose-950/60"
                              : "text-slate-500 bg-slate-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && <p className="text-xs text-slate-500">Loading node output details...</p>}

          {logs?.data && logs.data.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Step Outputs</p>
              {logs.data.map((row) => (
                <div key={row.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-medium">
                    <span>{getNodeTypeDef(row.nodeType).label}</span>
                  </div>
                  <pre className="text-slate-300 text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800/80 max-h-52 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(row.output, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExecutionsPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const queryClient = useQueryClient();

  const { data: workflow } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => fetchWorkflow(workflowId!),
    enabled: !!workflowId,
  });

  const { data: executions, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["executions", workflowId],
    queryFn: () => fetchExecutions(workflowId!),
    enabled: !!workflowId,
    // Keep polling while anything is still in flight, so status flips
    // from RUNNING to SUCCESS/FAILED without a manual refresh.
    refetchInterval: (query) => {
      const list = query.state.data as Execution[] | undefined;
      const hasActive = list?.some((e) => e.status === "PENDING" || e.status === "RUNNING");
      return hasActive ? 1500 : false;
    },
  });

  const runMutation = useMutation({
    mutationFn: () => startWorkflowExecution(workflowId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executions", workflowId] });
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={`/workflows/${workflowId}`}
              className="text-sm text-slate-500 hover:text-slate-300 inline-flex items-center gap-1"
            >
              &larr; Back to editor
            </Link>
            <h1 className="text-xl font-semibold mt-1 text-slate-100">
              {workflow?.name ? `${workflow.name} — Executions` : "Execution History"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 rounded-md px-3 py-2 text-sm font-medium transition"
              title="Refresh executions list"
            >
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md px-4 py-2 text-sm font-medium transition shadow-sm"
              title="Queue new execution via BullMQ"
            >
              {runMutation.isPending ? "Starting..." : "Run"}
            </button>
          </div>
        </div>

        {isLoading && <p className="text-slate-400 text-sm">Loading execution history...</p>}
        {executions?.length === 0 && (
          <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
            <p className="text-slate-400 text-sm">No executions yet.</p>
            <p className="text-slate-600 text-xs mt-1">Click Run or trigger via webhook to see runs here.</p>
          </div>
        )}

        <div className="space-y-2">
          {executions?.map((ex) => (
            <ExecutionRow key={ex.id} execution={ex} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExecutionsPage;
