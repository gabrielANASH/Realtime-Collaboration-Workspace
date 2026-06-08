import type { CreateWorkspaceInput, InviteMemberInput, UpdateMemberRoleInput, UpdateWorkspaceInput } from '@workspace/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getWorkspaceRequest(workspaceId: string, accessToken: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch workspace');
  }

  return response.json() as Promise<{
    workspace: {
      id: string;
      name: string;
      ownerId: string;
      description: string | null;
      createdAt: string;
      memberCount: number;
    };
  }>;
}

export async function createWorkspaceRequest(
  input: CreateWorkspaceInput,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create workspace');
  }

  return response.json() as Promise<{ workspace: { id: string; name: string; ownerId: string; description: string | null; createdAt: string } }>;
}

export async function listWorkspacesRequest(accessToken: string) {
  const response = await fetch(`${API_URL}/workspaces`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list workspaces');
  }

  return response.json() as Promise<{ workspaces: Array<{ id: string; name: string; ownerId: string; createdAt: string; role: string }> }>;
}

export async function listMembersRequest(workspaceId: string, accessToken: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to list members');
  }

  return response.json() as Promise<{ members: Array<{ userId: string; email: string; name: string | null; role: string; joinedAt: string }> }>;
}

export async function inviteMemberRequest(
  workspaceId: string,
  input: InviteMemberInput,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to invite member');
  }

  return response.json();
}

export async function removeMemberRequest(
  workspaceId: string,
  userId: string,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to remove member');
  }

  return response.json();
}

export async function updateMemberRoleRequest(
  workspaceId: string,
  userId: string,
  input: UpdateMemberRoleInput,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to update member role');
  }

  return response.json();
}

export async function updateWorkspaceRequest(
  workspaceId: string,
  input: UpdateWorkspaceInput,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to update workspace');
  }

  return response.json() as Promise<{ workspace: { id: string; name: string; ownerId: string; description: string | null; createdAt: string } }>;
}

export async function deleteWorkspaceRequest(
  workspaceId: string,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to delete workspace');
  }

  return response.json() as Promise<{ success: true }>;
}
