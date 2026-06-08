'use client';

import { useNotifications } from './use-notifications';

export function NotificationsPanel() {
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-50">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-400">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-brand-300 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
          Loading notifications...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
          No notifications yet.
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.readAt && markAsRead(n.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                n.readAt
                  ? 'border-white/5 bg-white/[0.02]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={`text-sm ${
                      n.readAt ? 'text-slate-400' : 'text-slate-50 font-medium'
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.readAt && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-300" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
