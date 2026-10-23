import api from "./axios";

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

export async function fetchWorkspaceCredentials(workspaceId: string): Promise<Credential[]> {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/credentials`);
  return data.credentials;
}

export async function fetchWorkflowCredentials(workflowId: string): Promise<Credential[]> {
  const { data } = await api.get(`/api/workflows/${workflowId}/credentials`);
  return data.credentials;
}

export async function createCredential(
  workspaceId: string,
  name: string,
  type: string,
  value: string
): Promise<Credential> {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/credentials`, {
    name,
    type,
    value,
  });
  return data.credential;
}

export async function updateCredential(
  id: string,
  updates: { name?: string; value?: string }
): Promise<Credential> {
  const { data } = await api.patch(`/api/credentials/${id}`, updates);
  return data.credential;
}

export async function deleteCredential(id: string): Promise<void> {
  await api.delete(`/api/credentials/${id}`);
}
