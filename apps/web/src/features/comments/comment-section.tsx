'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useDocumentComments } from './use-document-comments';
import { MentionInput } from './mention-input';
import { CommentCard } from './comment-card';
import { listMembersRequest } from '@/features/workspaces/workspace-api';

type CommentSectionProps = {
  workspaceId: string;
  documentId: string;
};

export function CommentSection({ workspaceId, documentId }: CommentSectionProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { comments, loading, error, createComment, deleteComment, refresh } = useDocumentComments(
    workspaceId,
    documentId,
  );
  const [newComment, setNewComment] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken || !workspaceId) return;
    listMembersRequest(workspaceId, accessToken)
      .then((data) => {
        setMembers(
          data.members.map((m: { userId: string; name: string | null; email: string }) => ({
            id: m.userId,
            name: m.name,
            email: m.email,
          })),
        );
      })
      .catch(() => {});
  }, [accessToken, workspaceId]);

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createComment({ content: newComment.trim() });
      setNewComment('');
    } catch {
      // error handled by hook
    } finally {
      setSubmitting(false);
    }
  }, [newComment, submitting, createComment]);

  const handleReply = useCallback(
    async (parentId: string, content: string) => {
      try {
        await createComment({ content, parentId });
      } catch {
        // error handled by hook
      }
    },
    [createComment],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-50">
          Comments ({comments.length})
        </h3>
        <button
          onClick={refresh}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      <MentionInput
        value={newComment}
        onChange={setNewComment}
        members={members}
        placeholder="Write a comment... (@ to mention someone)"
        disabled={submitting}
        onSubmit={handleSubmit}
      />

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>

      {loading && (
        <div className="text-sm text-slate-400">Loading comments...</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && comments.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
          No comments yet. Start the conversation!
        </div>
      )}

      {!loading && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onDelete={deleteComment}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
