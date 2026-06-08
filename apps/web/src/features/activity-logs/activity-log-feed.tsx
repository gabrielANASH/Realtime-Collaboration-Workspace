'use client';

import { useState } from 'react';
import { useActivityLogs } from './use-activity-logs';

type ActivityLogFeedProps = {
  workspaceId: string;
};

const actionLabels: Record<string, string> = {
  workspace_created: 'created the workspace',
  document_created: 'created a document',
  document_updated: 'updated a document',
  document_deleted: 'deleted a document',
  comment_created: 'added a comment',
  member_invited: 'invited a member',
  member_removed: 'removed a member',
  member_role_changed: 'changed a member role',
  workspace_updated: 'updated workspace settings',
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function logDescription(log: { action: string; metadata: Record<string, unknown> | null }): string | null {
  if (!log.metadata) return null;
  if (log.action === 'document_created' || log.action === 'document_updated') {
    const title = log.metadata.title;
    if (typeof title === 'string') return `"${title}"`;
  }
  if (log.action === 'comment_created') {
    const title = log.metadata.documentTitle;
    if (typeof title === 'string') return `on document "${title}"`;
  }
  if (log.action === 'member_invited') {
    const email = log.metadata.email;
    if (typeof email === 'string') return email;
  }
  if (log.action === 'member_removed') {
    const email = log.metadata.email;
    if (typeof email === 'string') return email;
  }
  if (log.action === 'member_role_changed') {
    const email = log.metadata.email;
    if (typeof email === 'string') return email;
  }
  return null;
}

export function ActivityLogFeed({ workspaceId }: ActivityLogFeedProps) {
  const { logs, loading, error, refresh, hasMore, loadMore, loadingMore } = useActivityLogs(workspaceId);
  const [collapsed, setCollapsed] = useState(true);

  const displayedLogs = collapsed ? logs.slice(0, 10) : logs;

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        Loading activity...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-400">
        <p>{error}</p>
        <button onClick={refresh} className="mt-2 text-brand-300 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        No activity yet.
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {displayedLogs.map((log) => {
          const desc = logDescription(log);
          return (
            <div
              key={log.id}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-slate-50">
                      {log.actor?.name ?? 'Someone'}
                    </span>{' '}
                    {actionLabels[log.action] ?? log.action.replace(/_/g, ' ')}
                  </p>
                  {desc && (
                    <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                  )}
                </div>
                <time
                  className="shrink-0 whitespace-nowrap text-[10px] text-slate-600"
                  title={new Date(log.createdAt).toLocaleString()}
                >
                  {formatRelativeTime(new Date(log.createdAt))}
                </time>
              </div>
            </div>
          );
        })}
      </div>

      {collapsed && logs.length > 10 && (
        <button
          onClick={() => setCollapsed(false)}
          className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-slate-50 hover:border-white/30 transition-colors"
        >
          Show all {logs.length} entries
        </button>
      )}

      {!collapsed && hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-slate-50 hover:border-white/30 transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading more...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
