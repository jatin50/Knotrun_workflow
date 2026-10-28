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
  PENDING: "text-amber-300 bg-amber-950/60 border-amber-800/80",
  RUNNING: "text-indigo-300 bg-indigo-950/80 border-indigo-800 animate-pulse",
  SUCCESS: "text-emerald-300 bg-emerald-950/80 border-emerald-800",
  FAILED: "text-rose-300 bg-rose-950/80 border-rose-800",
  CANCELLED: "text-slate-400 bg-slate-800 border-slate-700",
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded transition"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
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

  let rawError: string | null = null;

  if (execution.logs) {
    try {
      const parsed = JSON.parse(execution.logs);
      if (Array.isArray(parsed)) {
        parsedLogs = parsed;
      } else if (typeof parsed === "object" && parsed !== null && parsed.error) {
        rawError = String(parsed.error);
      }
    } catch {
      rawError = execution.logs;
    }
  }

  const isPending = execution.status === "PENDING";
  const isRunning = execution.status === "RUNNING";

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
            {execution.startedAt
              ? new Date(execution.startedAt).toLocaleString()
              : execution.finishedAt
                ? new Date(execution.finishedAt).toLocaleString()
                : "Just queued"}
          </span>
          <span className="text-[11px] text-slate-600 font-mono">#{execution.id.slice(-6)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">{formatDuration(execution.duration)}</span>
          <span className="text-slate-500 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3.5 space-y-4 bg-slate-950/60">
          {/* Pending state banner */}
          {isPending && (
            <div className="flex items-center gap-2.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-900/60 p-3 rounded-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>Queued in BullMQ. Worker is preparing pipeline execution...</span>
            </div>
          )}

          {/* Running state banner */}
          {isRunning && (
            <div className="flex items-center gap-2.5 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 p-3 rounded-md">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
              <span>Pipeline execution in progress...</span>
            </div>
          )}

          {/* Root error callout */}
          {rawError && (
            <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-900/80 p-3 rounded-md space-y-1">
              <p className="font-semibold text-rose-400 uppercase tracking-wide text-[10px]">Execution Error</p>
              <pre className="font-mono whitespace-pre-wrap">{rawError}</pre>
            </div>
          )}

          {/* Pipeline Steps breakdown */}
          {parsedLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pipeline Steps</p>
              <div className="space-y-1.5">
                {parsedLogs.map((r) => {
                  let label = r.type;
                  try {
                    label = getNodeTypeDef(r.type).label;
                  } catch {
                    // fallback if unregistered node type
                  }

                  return (
                    <div
                      key={r.nodeId}
                      className="text-xs bg-slate-900/90 px-3 py-2 rounded-md border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-medium">{label}</span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-slate-500 font-mono">{r.durationMs}ms</span>
                          <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                              r.status === "success"
                                ? "text-emerald-400 bg-emerald-950/60 border border-emerald-900/80"
                                : r.status === "failed"
                                  ? "text-rose-400 bg-rose-950/60 border border-rose-900/80"
                                  : "text-slate-400 bg-slate-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                      {r.error && (
                        <p className="text-[11px] text-rose-400 font-mono bg-rose-950/30 p-1.5 rounded border border-rose-900/40">
                          {r.error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLoading && <p className="text-xs text-slate-500">Loading node output details...</p>}

          {/* Step Outputs */}
          {logs?.data && logs.data.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Step Outputs</p>
              <div className="space-y-2">
                {logs.data.map((row) => {
                  let label = row.nodeType;
                  try {
                    label = getNodeTypeDef(row.nodeType).label;
                  } catch {
                    // fallback
                  }
                  const outputJson = JSON.stringify(row.output, null, 2);

                  return (
                    <div key={row.id} className="text-xs space-y-1.5 bg-slate-900/50 p-2.5 rounded-md border border-slate-800">
                      <div className="flex items-center justify-between text-slate-300 font-medium">
                        <span>{label}</span>
                        <CopyButton text={outputJson} />
                      </div>
                      <pre className="text-slate-300 text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800 max-h-56 overflow-y-auto whitespace-pre-wrap">
                        {outputJson}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && !isPending && !isRunning && parsedLogs.length === 0 && (!logs?.data || logs.data.length === 0) && !rawError && (
            <p className="text-xs text-slate-500">No output recorded for this run.</p>
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

  const { data: executions, isLoading, refetch } = useQuery({
    queryKey: ["executions", workflowId],
    queryFn: () => fetchExecutions(workflowId!),
    enabled: !!workflowId,
    // Smooth background polling only while executions are active (PENDING or RUNNING)
    refetchInterval: (query) => {
      const list = query.state.data as Execution[] | undefined;
      const hasActive = list?.some((e) => e.status === "PENDING" || e.status === "RUNNING");
      return hasActive ? 3000 : false;
    },
  });

  const runMutation = useMutation({
    mutationFn: () => startWorkflowExecution(workflowId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executions", workflowId] });
    },
  });

  const hasActive = executions?.some((e) => e.status === "PENDING" || e.status === "RUNNING");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={`/workflows/${workflowId}`}
              className="text-sm text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 transition"
            >
              &larr; Back to editor
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-xl font-semibold text-slate-100">
                {workflow?.name ? `${workflow.name} — Executions` : "Execution History"}
              </h1>
              {hasActive && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-950/80 border border-indigo-800/80 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  Live Syncing
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md px-3 py-2 text-sm font-medium transition"
              title="Refresh executions list"
            >
              Refresh
            </button>
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition shadow-sm"
              title="Queue new execution via BullMQ"
            >
              {runMutation.isPending ? "Queuing..." : "Run"}
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
