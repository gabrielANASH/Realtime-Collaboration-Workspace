'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  listCommentsRequest,
  createCommentRequest,
  deleteCommentRequest,
  type CommentRecord,
} from './comment-api';
import type { CreateCommentInput } from '@workspace/shared';

export function useDocumentComments(workspaceId: string | undefined, documentId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!accessToken || !workspaceId || !documentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listCommentsRequest(workspaceId, documentId, accessToken);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, documentId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return;

    const handleNewComment = (data: { documentId: string; comment: CommentRecord }) => {
      if (data.documentId === documentId) {
        fetchComments();
      }
    };

    socket.on('comment:new', handleNewComment);
    return () => {
      socket.off('comment:new', handleNewComment);
    };
  }, [fetchComments, workspaceId, documentId]);

  const createComment = useCallback(
    async (input: CreateCommentInput) => {
      if (!accessToken || !workspaceId || !documentId) return;
      const comment = await createCommentRequest(workspaceId, documentId, input, accessToken);
      setComments((prev) => [...prev, comment]);
      return comment;
    },
    [accessToken, workspaceId, documentId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!accessToken || !workspaceId || !documentId) return;
      await deleteCommentRequest(workspaceId, documentId, commentId, accessToken);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [accessToken, workspaceId, documentId],
  );

  return { comments, loading, error, createComment, deleteComment, refresh: fetchComments };
}
