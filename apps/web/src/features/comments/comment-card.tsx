'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { CommentRecord } from './comment-api';

type CommentCardProps = {
  comment: CommentRecord;
  onDelete: (id: string) => void;
  onReply: (parentId: string, content: string) => void;
};

export function CommentCard({ comment, onDelete, onReply }: CommentCardProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const isAuthor = currentUserId === comment.userId;

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
  };

  const highlightMentions = (text: string) => {
    return text.split(/(@\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-indigo-400 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-300">
            {(comment.author.name || comment.author.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {comment.author.name || comment.author.email.split('@')[0]}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        {isAuthor && (
          <button
            onClick={() => onDelete(comment.id)}
            className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-all"
          >
            Delete
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">
        {highlightMentions(comment.content)}
      </p>
      <div className="mt-2">
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showReplyInput ? 'Cancel' : 'Reply'}
        </button>
      </div>
      {showReplyInput && (
        <div className="mt-2 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim()}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
      {(comment.replies?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-2 border-l border-white/10 pl-4">
          {comment.replies?.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
