import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import {
  fetchWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  type Workspace,
} from "../lib/workspace.api";
import { createWorkflow } from "../lib/workflow.api";
import { saveGraph } from "../lib/graph.api";
import TemplateGalleryModal from "../components/TemplateGalleryModal";
import {
  WORKFLOW_TEMPLATES,
  instantiateTemplate,
  type WorkflowTemplate,
} from "../templates/workflowTemplates";

function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isGuest = !user || user.email?.includes("guest");

  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);

  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setNewName("");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWorkspace(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setRenamingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  }

  function startRename(ws: Workspace) {
    setRenamingId(ws.id);
    setRenameValue(ws.name);
  }

  function submitRename(id: string) {
    if (!renameValue.trim()) return;
    renameMutation.mutate({ id, name: renameValue.trim() });
  }

  function confirmDelete(ws: Workspace) {
    if (window.confirm(`Delete workspace "${ws.name}"? This deletes everything inside it.`)) {
      deleteMutation.mutate(ws.id);
    }
  }

  async function handleSelectTemplate(template: WorkflowTemplate) {
    setLoadingTemplateId(template.id);
    try {
      let targetWsId = workspaces?.[0]?.id;
      if (!targetWsId) {
        const newWs = await createWorkspace("Recruiter Demo Workspace");
        targetWsId = newWs.id;
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      }

      const { nodes, connections } = instantiateTemplate(template);
      const newWf = await createWorkflow(targetWsId, template.title);
      await saveGraph(newWf.id, nodes, connections);
      setIsTemplateModalOpen(false);
      navigate(`/workflows/${newWf.id}`);
    } catch (err) {
      alert("Failed to load template: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoadingTemplateId(null);
    }
  }

  // Top 3 featured templates for quick-start strip
  const featuredTemplates = WORKFLOW_TEMPLATES.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 selection:bg-white/20">
      {/* EXPANSIVE FULL-WIDTH CONTAINER (ELIMINATES DEAD SPACE) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-10 lg:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* TOP NAVBAR / HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3.5">
            {isGuest && (
              <span className="px-3 py-1 text-xs font-mono font-medium rounded-lg bg-white/10 text-slate-300 border border-white/15 tracking-wider uppercase">
                Guest Mode
              </span>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Workspaces
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your in-memory execution environments & DAG pipelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Kernel: 81,151 ops/s</span>
            </div>

            <a
              href="http://localhost:3000"
              className="text-xs font-mono text-slate-400 hover:text-white px-3.5 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition"
            >
              3D Site &rarr;
            </a>

            {isGuest ? (
              <Link
                to="/login"
                className="text-xs font-mono font-bold text-slate-950 bg-white hover:bg-slate-200 px-5 py-2 rounded-lg transition shadow-md uppercase tracking-wider"
              >
                Log In
              </Link>
            ) : (
              <button
                onClick={() => logout()}
                className="text-xs font-mono text-slate-400 hover:text-red-400 px-3.5 py-2 rounded-lg border border-white/10 hover:bg-red-950/20 transition"
              >
                Log out
              </button>
            )}
          </div>
        </header>

        {/* HERO SHOWCASE BANNER (EXPANSIVE WIDE HERO) */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0B111E]/95 border border-white/15 shadow-xl backdrop-blur-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 flex-shrink-0">
              <svg className="w-6 h-6 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  SaaS Workflow Template Gallery
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Production Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Explore pre-architected enterprise DAG workflows with ready-to-test nodes, isolated V8 execution, and pre-configured SSRF firewalls.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-6 py-3 text-xs font-mono font-bold uppercase rounded-xl bg-white hover:bg-slate-200 text-slate-950 shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap self-stretch lg:self-auto text-center"
          >
            Browse Templates (1-Click)
          </button>
        </div>

        {/* WORKSPACE ACTIONS & CREATION TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Your Workspaces</h2>
            <span className="text-xs font-mono text-slate-500">
              ({workspaces?.length ?? 0})
            </span>
          </div>

          <form onSubmit={handleCreate} className="flex gap-2.5 max-w-md w-full sm:w-auto">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Create new workspace..."
              className="flex-1 sm:w-64 rounded-xl bg-[#0B111E] border border-white/15 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-white/40 transition"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-slate-800 hover:bg-slate-700 border border-white/15 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl px-4 py-2.5 text-xs font-mono font-medium tracking-wider uppercase transition whitespace-nowrap"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        {createMutation.isError && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-2.5">
            Couldn't create workspace. Please try again.
          </p>
        )}

        {isLoading && <p className="text-slate-400 text-xs font-mono">Loading workspaces...</p>}
        {error && <p className="text-red-400 text-xs font-mono">Couldn't load workspaces.</p>}

        {/* WORKSPACES RESPONSIVE GRID (EXPANSIVE 2-TO-3 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces?.map((ws) => (
            <div
              key={ws.id}
              className="group relative flex flex-col justify-between bg-[#0B111E]/90 hover:bg-[#0E1626] border border-white/10 hover:border-white/25 rounded-2xl p-6 transition shadow-lg min-h-[170px]"
            >
              {renamingId === ws.id ? (
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg bg-slate-900 border border-white/30 px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitRename(ws.id)}
                      className="px-3 py-1 text-xs font-mono bg-white text-slate-950 font-bold rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="px-3 py-1 text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link to={`/workspaces/${ws.id}`} className="group-hover:text-white transition">
                          <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition truncate">
                            {ws.name}
                          </h3>
                        </Link>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          ID: {ws.id.slice(-8)}
                        </p>
                      </div>
                      {ws.name.includes("Recruiter") && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/20 whitespace-nowrap">
                          PRE-LOADED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 py-2 border-y border-white/5 text-xs font-mono text-slate-400">
                      <div>
                        <span className="text-white font-bold text-sm">
                          {ws._count?.workflows ?? 0}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          {ws._count?.workflows === 1 ? "workflow" : "workflows"}
                        </span>
                      </div>
                      <div className="h-3 w-px bg-white/10" />
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-2">
                    <Link
                      to={`/workspaces/${ws.id}`}
                      className="text-xs font-mono font-medium text-slate-300 hover:text-white flex items-center gap-1 transition"
                    >
                      <span>Open Workspace</span>
                      <span>&rarr;</span>
                    </Link>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <button
                        onClick={() => startRename(ws)}
                        className="text-slate-400 hover:text-slate-200 transition"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => confirmDelete(ws)}
                        className="text-red-400/80 hover:text-red-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* QUICK CREATE CARD */}
          <div
            onClick={() => {
              const name = prompt("Enter new workspace name:");
              if (name && name.trim()) {
                createMutation.mutate(name.trim());
              }
            }}
            className="cursor-pointer border border-dashed border-white/15 hover:border-white/35 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 bg-white/[0.01] hover:bg-white/[0.03] transition min-h-[170px]"
          >
            <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-300 text-lg">
              +
            </div>
            <p className="text-xs font-medium text-slate-300">Create New Workspace</p>
            <p className="text-[11px] text-slate-500 font-mono">Click to initialize environment</p>
          </div>
        </div>

        {/* QUICK BLUEPRINTS & TEMPLATES PREVIEW (FILLS DESKTOP SCREEN WITH PRODUCTIVE UTILITY) */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Featured Blueprint Templates
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly spawn any of these production architectures into your workspace
              </p>
            </div>
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="text-xs font-mono text-slate-400 hover:text-white transition"
            >
              View all 10+ templates &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredTemplates.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className="cursor-pointer p-5 rounded-xl bg-[#0B111E]/70 hover:bg-[#0B111E] border border-white/10 hover:border-white/25 transition space-y-2.5 shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="uppercase">{t.category}</span>
                    <span className="text-emerald-400 font-semibold">{t.estimatedOps}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">
                    {t.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="text-[11px] text-slate-500">
                    {t.nodeTypes.slice(0, 3).join(" • ")}
                  </span>
                  <span className="text-white hover:underline">&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TEMPLATE GALLERY MODAL */}
      <TemplateGalleryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        loadingTemplateId={loadingTemplateId}
      />
    </div>
  );
}

export default DashboardPage;
