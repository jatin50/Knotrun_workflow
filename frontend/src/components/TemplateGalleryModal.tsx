import { useState } from "react";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "../templates/workflowTemplates";

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkflowTemplate) => void;
  loadingTemplateId?: string | null;
}

export default function TemplateGalleryModal({
  isOpen,
  onClose,
  onSelectTemplate,
  loadingTemplateId = null,
}: TemplateGalleryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const categories = [
    "All",
    "DevOps & Monitoring",
    "AI & Automation",
    "Data & Analytics",
    "Security & Webhooks",
  ];

  const filteredTemplates = WORKFLOW_TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === "All" || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.nodeTypes.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-lg">
                ⚡
              </span>
              <h2 className="text-xl font-bold text-slate-100">SaaS Workflow Template Gallery</h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                Production Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Select any pre-architected enterprise workflow to launch it with 1-click. All nodes and DAG routes are pre-configured.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-800/60 bg-slate-950/40">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search templates or nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col justify-between p-5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-indigo-500/50 transition duration-200 group"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-lg bg-slate-800 border border-slate-700/80">
                      {template.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition">
                        {template.title}
                      </h3>
                      <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded border ${template.badgeColor}`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {template.description}
                </p>

                {/* Included Nodes Pill List */}
                <div className="mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1.5">
                    Workflow Pipeline ({template.nodes.length} Nodes)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {template.nodeTypes.map((nodeName, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        {nodeName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer & Action */}
              <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between mt-auto">
                <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
                  ⚡ {template.estimatedOps}
                </span>

                <button
                  onClick={() => onSelectTemplate(template)}
                  disabled={loadingTemplateId !== null}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm hover:shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingTemplateId === template.id ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Loading...</span>
                    </span>
                  ) : (
                    <>
                      <span>Use Template</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-400">
              <p className="text-sm">No templates match your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
