import type { CreateCommentInput } from '@workspace/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type CommentAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type CommentRecord = {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  replies?: CommentRecord[];
};

export async function listCommentsRequest(
  workspaceId: string,
  documentId: string,
  accessToken: string,
): Promise<CommentRecord[]> {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/documents/${documentId}/comments`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }

  const data = await response.json();
  return data.comments;
}

export async function createCommentRequest(
  workspaceId: string,
  documentId: string,
  input: CreateCommentInput,
  accessToken: string,
): Promise<CommentRecord> {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/documents/${documentId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to create comment');
  }

  return response.json().then((r) => r.comment);
}

export async function deleteCommentRequest(
  workspaceId: string,
  documentId: string,
  commentId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to delete comment');
  }
}
