'use client';

import { useRouter } from 'next/navigation';
import { NotificationsPanel } from '@/features/notifications/notifications-panel';

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Notifications</h1>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-50 transition-colors"
          >
            Back
          </button>
        </div>
        <NotificationsPanel />
      </div>
    </main>
  );
}
