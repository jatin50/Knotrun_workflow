import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWorkspace } from "../lib/workspace.api";
import {
  fetchWorkflows,
  createWorkflow,
  renameWorkflow,
  deleteWorkflow,
  type Workflow,
} from "../lib/workflow.api";
import {
  fetchWorkspaceCredentials,
  createCredential,
  deleteCredential,
  type Credential,
} from "../lib/credential.api";

function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"workflows" | "credentials">("workflows");

  // Workflow state
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Credential state
  const [newCredName, setNewCredName] = useState("");
  const [newCredType, setNewCredType] = useState("bearer_token");
  const [newCredValue, setNewCredValue] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => fetchWorkspace(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: workflows, isLoading: isWorkflowsLoading, error: workflowsError } = useQuery({
    queryKey: ["workflows", workspaceId],
    queryFn: () => fetchWorkflows(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: credentials, isLoading: isCredsLoading, error: credsError } = useQuery({
    queryKey: ["credentials", workspaceId],
    queryFn: () => fetchWorkspaceCredentials(workspaceId!),
    enabled: !!workspaceId,
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (name: string) => createWorkflow(workspaceId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
      setNewWorkflowName("");
    },
  });

  const renameWorkflowMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWorkflow(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
      setRenamingId(null);
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });

  const createCredMutation = useMutation({
    mutationFn: (data: { name: string; type: string; value: string }) =>
      createCredential(workspaceId!, data.name, data.type, data.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", workspaceId] });
      setNewCredName("");
      setNewCredValue("");
    },
  });

  const deleteCredMutation = useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", workspaceId] });
    },
  });

  function handleCreateWorkflow(e: FormEvent) {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    createWorkflowMutation.mutate(newWorkflowName.trim());
  }

  function handleCreateCred(e: FormEvent) {
    e.preventDefault();
    if (!newCredName.trim() || !newCredValue.trim()) return;
    createCredMutation.mutate({
      name: newCredName.trim(),
      type: newCredType,
      value: newCredValue.trim(),
    });
  }

  function startRename(wf: Workflow) {
    setRenamingId(wf.id);
    setRenameValue(wf.name);
  }

  function submitRename(id: string) {
    if (!renameValue.trim()) return;
    renameWorkflowMutation.mutate({ id, name: renameValue.trim() });
  }

  function confirmDeleteWorkflow(wf: Workflow) {
    if (window.confirm(`Delete workflow "${wf.name}"?`)) {
      deleteWorkflowMutation.mutate(wf.id);
    }
  }

  function confirmDeleteCred(cred: Credential) {
    if (window.confirm(`Delete credential "${cred.name}"?`)) {
      deleteCredMutation.mutate(cred.id);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-300">
            &larr; Workspaces
          </Link>
          <h1 className="text-2xl font-bold mt-1 text-slate-100">
            {workspace?.name ?? "Workspace"}
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab("workflows")}
            className={`pb-3 text-sm font-medium transition relative ${
              activeTab === "workflows"
                ? "text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Workflows ({workflows?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("credentials")}
            className={`pb-3 text-sm font-medium transition relative ${
              activeTab === "credentials"
                ? "text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Credentials ({credentials?.length ?? 0})
          </button>
        </div>

        {/* WORKFLOWS TAB */}
        {activeTab === "workflows" && (
          <div className="space-y-4">
            <form onSubmit={handleCreateWorkflow} className="flex gap-2">
              <input
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="New workflow name..."
                className="flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={createWorkflowMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md px-4 py-2 text-sm font-medium transition"
              >
                {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
              </button>
            </form>
            {createWorkflowMutation.isError && (
              <p className="text-sm text-red-400">Couldn't create workflow. Try again.</p>
            )}

            {isWorkflowsLoading && <p className="text-slate-400 text-sm">Loading workflows...</p>}
            {workflowsError && <p className="text-red-400 text-sm">Couldn't load workflows.</p>}

            <div className="space-y-2">
              {workflows?.length === 0 && (
                <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm">No workflows yet.</p>
                  <p className="text-slate-600 text-xs mt-1">Create one above to get started.</p>
                </div>
              )}

              {workflows?.map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 hover:border-slate-700 transition"
                >
                  {renamingId === wf.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => submitRename(wf.id)}
                        className="text-sm text-indigo-400 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="text-sm text-slate-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link to={`/workflows/${wf.id}`} className="flex-1">
                        <p className="font-medium text-slate-100 hover:text-indigo-300 transition">
                          {wf.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {wf.active ? "Active" : "Inactive"} · v{wf.version}
                          {wf.description ? ` · ${wf.description}` : ""}
                        </p>
                      </Link>
                      <div className="flex gap-3 text-sm">
                        <button
                          onClick={() => startRename(wf)}
                          className="text-slate-400 hover:text-slate-200 transition"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => confirmDeleteWorkflow(wf)}
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
        )}

        {/* CREDENTIALS TAB */}
        {activeTab === "credentials" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200">Add New Credential</h2>
              <form onSubmit={handleCreateCred} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Credential Name</label>
                    <input
                      value={newCredName}
                      onChange={(e) => setNewCredName(e.target.value)}
                      placeholder="e.g. OpenAI Key, Stripe API Token"
                      className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Credential Type</label>
                    <select
                      value={newCredType}
                      onChange={(e) => setNewCredType(e.target.value)}
                      className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="bearer_token">Bearer Token (Header)</option>
                      <option value="api_key">API Key</option>
                      <option value="basic_auth">Basic Auth / Secret</option>
                      <option value="custom">Custom Secret</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Secret Value</label>
                  <input
                    type="password"
                    value={newCredValue}
                    onChange={(e) => setNewCredValue(e.target.value)}
                    placeholder="Enter secret (encrypted using AES-256 before storing)..."
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Value is encrypted on the server with AES-256-GCM and never returned to the browser.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={createCredMutation.isPending || !newCredName.trim() || !newCredValue.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md px-4 py-2 text-sm font-medium transition"
                  >
                    {createCredMutation.isPending ? "Saving..." : "Save Credential"}
                  </button>
                </div>
              </form>
              {createCredMutation.isError && (
                <p className="text-sm text-red-400">Failed to save credential. Check your inputs.</p>
              )}
            </div>

            {isCredsLoading && <p className="text-slate-400 text-sm">Loading credentials...</p>}
            {credsError && <p className="text-red-400 text-sm">Couldn't load credentials.</p>}

            <div className="space-y-2">
              {credentials?.length === 0 && (
                <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm">No credentials saved yet.</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Add API keys or tokens above to securely use them in your workflows.
                  </p>
                </div>
              )}

              {credentials?.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-200">{cred.name}</p>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {cred.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Secret: ••••••••••••••••</span>
                      <span>Added {new Date(cred.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteCred(cred)}
                    className="text-red-400 hover:text-red-300 text-sm transition"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspacePage;