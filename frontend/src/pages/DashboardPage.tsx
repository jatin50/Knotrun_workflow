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
import { instantiateTemplate, type WorkflowTemplate } from "../templates/workflowTemplates";

function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 p-6 sm:p-10 selection:bg-amber-500/30">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-['Space_Grotesk']">
                  Workspaces
                </h1>
                {user?.email?.includes("guest") && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    GUEST PREVIEW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Signed in as <span className="text-slate-200 font-medium">{user?.name}</span> ({user?.email})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition"
            >
              3D Site &rarr;
            </a>
            <button
              onClick={() => logout()}
              className="text-xs font-mono text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-red-950/20 transition"
            >
              Log out
            </button>
          </div>
        </div>

        {/* RECRUITER / TEMPLATE GALLERY SHOWCASE BANNER */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-[#0B111E] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              ⚡
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                SaaS Workflow Template Gallery
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Explore pre-architected enterprise DAG workflows with ready-to-test nodes and SSRF guards.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-4 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            Browse Templates (1-Click)
          </button>
        </div>

        {/* WORKSPACE CREATION FORM */}
        <form onSubmit={handleCreate} className="flex gap-2.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Create a new workspace..."
            className="flex-1 rounded-xl bg-[#0B111E] border border-white/15 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 transition"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700 border border-white/15 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl px-5 py-2.5 text-xs font-mono font-bold tracking-wider uppercase transition"
          >
            {createMutation.isPending ? "Creating..." : "Create Workspace"}
          </button>
        </form>

        {createMutation.isError && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-2.5">
            Couldn't create workspace. Please try again.
          </p>
        )}

        {isLoading && <p className="text-slate-400 text-xs font-mono">Loading workspaces...</p>}
        {error && <p className="text-red-400 text-xs font-mono">Couldn't load workspaces.</p>}

        {/* WORKSPACES LIST */}
        <div className="space-y-3">
          {workspaces?.length === 0 && (
            <div className="p-8 text-center bg-[#0B111E]/70 border border-white/10 rounded-2xl space-y-2">
              <p className="text-slate-400 text-xs">
                No workspaces yet. Click "Browse Templates" above to generate a pre-loaded demo workspace!
              </p>
            </div>
          )}

          {workspaces?.map((ws) => (
            <div
              key={ws.id}
              className="group flex items-center justify-between bg-[#0B111E]/90 hover:bg-[#0E1626] border border-white/10 hover:border-amber-500/30 rounded-xl px-5 py-4 transition shadow-md"
            >
              {renamingId === ws.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-lg bg-slate-900 border border-amber-500/50 px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    onClick={() => submitRename(ws.id)}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="text-xs font-mono text-slate-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <Link to={`/workspaces/${ws.id}`} className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {ws.name}
                      </p>
                      {ws.name.includes("Recruiter") && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          PRE-LOADED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {ws._count?.workflows ?? 0} workflow
                      {ws._count?.workflows === 1 ? "" : "s"} • Open workspace &rarr;
                    </p>
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
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
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
