import { getNodeTypeDef } from "../nodes/nodeTypes";
import type { TestRunResult, NodeStatus } from "../lib/execution.api";

const STATUS_CLASSES: Record<NodeStatus, string> = {
  success: "text-emerald-400 border-emerald-800/80 bg-emerald-950/30",
  failed: "text-rose-400 border-rose-800/80 bg-rose-950/30",
  skipped: "text-slate-400 border-slate-800 bg-slate-900/40",
};

function formatValue(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function TestResultsPanel({
  result,
  onClose,
}: {
  result: TestRunResult;
  onClose: () => void;
}) {
  const totalDuration = result.results.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);

  return (
    <div className="max-h-72 overflow-y-auto border-t border-slate-800 bg-slate-900 px-4 py-3 shadow-2xl">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Test Execution:
          </p>
          <span
            className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
              result.status === "success"
                ? "text-emerald-300 bg-emerald-950/80 border-emerald-800"
                : "text-rose-300 bg-rose-950/80 border-rose-800"
            }`}
          >
            {result.status.toUpperCase()}
          </span>
          <span className="text-xs font-mono text-slate-500">
            · {totalDuration}ms total
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 transition px-2 py-1 rounded hover:bg-slate-800"
          title="Dismiss test output"
        >
          Clear & Close ✕
        </button>
      </div>

      <div className="space-y-2">
        {result.results.map((r) => {
          const def = getNodeTypeDef(r.type);
          return (
            <div
              key={r.nodeId}
              className={`border rounded-md px-3 py-2 text-xs transition ${STATUS_CLASSES[r.status]}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200">{def.label}</span>
                <span className="font-mono text-[11px]">
                  {r.status}
                  {r.durationMs > 0 ? ` · ${r.durationMs}ms` : ""}
                </span>
              </div>
              {r.error && (
                <p className="mt-1.5 text-rose-300 bg-rose-950/50 p-2 rounded border border-rose-900 font-mono text-[11px]">
                  {r.error}
                </p>
              )}
              {r.output !== undefined && (
                <pre className="mt-1.5 whitespace-pre-wrap text-slate-300 font-mono text-[11px] bg-slate-950/70 p-2 rounded border border-slate-800/80 max-h-36 overflow-y-auto">
                  {formatValue(r.output)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TestResultsPanel;
