import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeTypeDef, type NodeConfig } from "../nodes/nodeTypes";

// Tailwind needs full literal class strings to detect them at build time —
// a dynamic `bg-${color}-500` template string would be invisible to its
// scanner, so every color variant is spelled out here instead.
const ACCENT_CLASSES: Record<string, { border: string; dot: string }> = {
  emerald: { border: "border-emerald-600", dot: "bg-emerald-500" },
  teal: { border: "border-teal-600", dot: "bg-teal-500" },
  purple: { border: "border-purple-600", dot: "bg-purple-500" },
  indigo: { border: "border-indigo-600", dot: "bg-indigo-500" },
  amber: { border: "border-amber-600", dot: "bg-amber-500" },
  sky: { border: "border-sky-600", dot: "bg-sky-500" },
  violet: { border: "border-violet-600", dot: "bg-violet-500" },
  blue: { border: "border-blue-600", dot: "bg-blue-500" },
  pink: { border: "border-pink-600", dot: "bg-pink-500" },
  cyan: { border: "border-cyan-600", dot: "bg-cyan-500" },
};

export interface WorkflowNodeData {
  nodeType: string;
  configuration: NodeConfig;
  [key: string]: unknown;
}

function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const def = getNodeTypeDef(nodeData.nodeType);
  const accent = ACCENT_CLASSES[def.color] ?? ACCENT_CLASSES.indigo;

  return (
    <div
      className={`min-w-48 rounded-lg bg-slate-900 border-2 ${
        selected ? "border-white" : accent.border
      } px-3 py-2 shadow-lg relative`}
    >
      {def.hasInput && (
        <Handle type="target" position={Position.Left} className="bg-slate-500!" />
      )}

      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
        <span className="text-sm font-medium text-slate-100">{def.label}</span>
      </div>
      <p className="text-xs text-slate-400 mt-1 truncate max-w-44">
        {def.summarize(nodeData.configuration ?? {})}
      </p>

      {def.type === "logic.if" ? (
        <>
          <div className="mt-2 pt-1 border-t border-slate-800 flex justify-between items-center text-[10px]">
            <span className="text-slate-500">Outputs</span>
            <div className="flex flex-col text-right font-mono font-medium">
              <span className="text-emerald-400">true &rarr;</span>
              <span className="text-rose-400">false &rarr;</span>
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: "68%", background: "#10b981", width: "9px", height: "9px" }}
            title="True branch"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: "86%", background: "#f43f5e", width: "9px", height: "9px" }}
            title="False branch"
          />
        </>
      ) : (
        <Handle type="source" position={Position.Right} className="bg-slate-500!" />
      )}
    </div>
  );
}

export default memo(WorkflowNode);
