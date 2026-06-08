import type { CreateDocumentInput, UpdateDocumentInput } from '@workspace/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function createDocumentRequest(
  workspaceId: string,
  input: CreateDocumentInput,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create document');
  }

  return response.json();
}

export async function getDocumentRequest(
  workspaceId: string,
  documentId: string,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/documents/${documentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }

  return response.json();
}

export async function updateDocumentRequest(
  workspaceId: string,
  documentId: string,
  input: UpdateDocumentInput,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to update document');
  }

  return response.json();
}

export async function deleteDocumentRequest(
  workspaceId: string,
  documentId: string,
  accessToken: string,
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete document');
  }

  return response.json();
}

export async function listDocumentsRequest(workspaceId: string, accessToken: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/documents`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list documents');
  }

  return response.json();
}
