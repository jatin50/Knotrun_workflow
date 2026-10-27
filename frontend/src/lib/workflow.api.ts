import api from "./axios";

export interface Workflow {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    active: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export async function fetchWorkflows(workspaceId: string): Promise<Workflow[]> {
    const { data } = await api.get(`/api/workspaces/${workspaceId}/workflows`);
    return data.workflows;
}

export async function fetchWorkflow(id: string): Promise<Workflow> {
    const { data } = await api.get(`/api/workflows/${id}`);
    return data.workflow;
}

export async function updateWorkflow(
    id: string,
    updates: Partial<{ name: string; description: string | null; active: boolean }>
): Promise<Workflow> {
    const { data } = await api.patch(`/api/workflows/${id}`, updates);
    return data.workflow;
}

export async function createWorkflow(workspaceId: string, name: string): Promise<Workflow> {
    const { data } = await api.post(`/api/workspaces/${workspaceId}/workflows`, { name });
    return data.workflow;
}

export async function renameWorkflow(id: string, name: string): Promise<Workflow> {
    const { data } = await api.patch(`/api/workflows/${id}`, { name });
    return data.workflow;
}

export async function deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/api/workflows/${id}`);
}
