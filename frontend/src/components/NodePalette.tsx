import { NODE_TYPES } from "../nodes/nodeTypes";

const ACCENT_DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  purple: "bg-purple-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  trigger: "Triggers",
  action: "Actions",
  ai: "AI & Models",
  database: "Database",
  communication: "Communication",
  logic: "Logic",
  data: "Data & Code",
};

function NodePalette() {
  function handleDragStart(e: React.DragEvent, nodeType: string) {
    e.dataTransfer.setData("application/workflow-node-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  const categories = Array.from(new Set(NODE_TYPES.map((n) => n.category)));

  return (
    <div className="w-60 shrink-0 border-r border-slate-800 bg-slate-900/50 p-3 overflow-y-auto space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Node Library
        </p>
        <p className="text-[11px] text-slate-500">Drag any node onto the canvas</p>
      </div>

      {categories.map((cat) => {
        const nodesInCat = NODE_TYPES.filter((n) => n.category === cat);
        return (
          <div key={cat} className="space-y-1.5">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide px-1">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            {nodesInCat.map((n) => (
              <div
                key={n.type}
                draggable
                onDragStart={(e) => handleDragStart(e, n.type)}
                className="flex items-center gap-2.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 cursor-grab active:cursor-grabbing hover:border-slate-600 hover:bg-slate-800 transition shadow-sm"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ACCENT_DOT[n.color] ?? "bg-slate-500"}`} />
                <span className="text-xs font-medium text-slate-200">{n.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default NodePalette;
