'use client';

import { use } from 'react';
import { ActivityLogFeed } from '@/features/activity-logs/activity-log-feed';

type ActivityPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default function ActivityPage({ params }: ActivityPageProps) {
  const { workspaceId } = use(params);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm text-slate-400">Workspace {workspaceId}</p>
          <h1 className="text-3xl font-semibold">Activity Log</h1>
        </div>
        <ActivityLogFeed workspaceId={workspaceId} />
      </div>
    </main>
  );
}
