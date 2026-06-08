'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { getUnreadCountRequest } from '@/features/notifications/notification-api';

type WorkspaceShellProps = {
  title: string;
  workspaceId?: string;
  children: React.ReactNode;
};

export function WorkspaceShell({ title, workspaceId, children }: WorkspaceShellProps) {
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    getUnreadCountRequest(accessToken)
      .then(setUnreadCount)
      .catch(() => {});
  }, [accessToken]);

  const handleLogout = () => {
    clear();
    document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
    router.push('/sign-in');
  };

  return (
    <section className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.href = '/notifications'}
            className="relative rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-slate-400 hover:text-slate-50 hover:border-white/30 transition-colors"
          >
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-300 px-1 text-[10px] font-medium text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            Notifications
          </button>
          {workspaceId && (
            <button
              onClick={() => window.location.href = `/workspaces/${workspaceId}/activity`}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-slate-400 hover:text-slate-50 hover:border-white/30 transition-colors"
            >
              Activity
            </button>
          )}
          <button
            onClick={() => window.location.href = '/settings'}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-slate-400 hover:text-slate-50 hover:border-white/30 transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-50 hover:border-white/30 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="flex-1 px-6 py-8">{children}</div>
    </section>
  );
}
