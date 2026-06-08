'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { getWorkspaceRequest, listMembersRequest } from '@/features/workspaces/workspace-api';
import { listDocumentsRequest } from '@/features/documents/document-api';
import { WorkspaceShell } from '@/features/workspaces/workspace-shell';

type WorkspaceData = {
  id: string;
  name: string;
  ownerId: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
};

type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
};

type DocumentSummary = {
  id: string;
  title: string;
  authorName: string | null;
  updatedAt: string;
};

export default function WorkspaceDashboardPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || !params.workspaceId) return;
    setLoading(true);
    setError('');

    Promise.all([
      getWorkspaceRequest(params.workspaceId, accessToken).then((r) => r.workspace),
      listMembersRequest(params.workspaceId, accessToken).then((r) => r.members),
      listDocumentsRequest(params.workspaceId, accessToken).then((r) => r.documents),
    ])
      .then(([ws, mems, docs]) => {
        setWorkspace(ws);
        setMembers(mems);
        setDocuments(docs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workspace'))
      .finally(() => setLoading(false));
  }, [accessToken, params.workspaceId]);

  if (loading) {
    return (
      <WorkspaceShell title="Loading...">
        <div className="text-sm text-slate-400">Loading workspace...</div>
      </WorkspaceShell>
    );
  }

  if (error || !workspace) {
    return (
      <WorkspaceShell title="Error">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error || 'Workspace not found'}
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title={workspace.name} workspaceId={params.workspaceId}>
      <div className="space-y-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs text-slate-400 font-mono mb-1">{params.workspaceId}</p>
          {workspace.description && (
            <p className="text-sm text-slate-300 mt-2">{workspace.description}</p>
          )}
          <div className="flex gap-4 mt-4 text-xs text-slate-500">
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {documents.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Recent Documents</h3>
            <div className="grid gap-2">
              {documents.slice(0, 5).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() =>
                    router.push(`/workspaces/${params.workspaceId}/documents/${doc.id}`)
                  }
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-50">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {doc.authorName ? `by ${doc.authorName} · ` : ''}
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push(`/workspaces/${params.workspaceId}/documents`)}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 transition-colors"
          >
            <h3 className="text-lg font-medium text-slate-50">Documents</h3>
            <p className="mt-1 text-sm text-slate-400">Browse and edit documents</p>
          </button>

          <button
            onClick={() => router.push(`/workspaces/${params.workspaceId}/members`)}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 transition-colors"
          >
            <h3 className="text-lg font-medium text-slate-50">Members</h3>
            <p className="mt-1 text-sm text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </button>

          <button
            onClick={() => router.push(`/workspaces/${params.workspaceId}/activity`)}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 transition-colors"
          >
            <h3 className="text-lg font-medium text-slate-50">Activity</h3>
            <p className="mt-1 text-sm text-slate-400">View activity log</p>
          </button>

          <button
            onClick={() => window.location.href = '/notifications'}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 transition-colors"
          >
            <h3 className="text-lg font-medium text-slate-50">Notifications</h3>
            <p className="mt-1 text-sm text-slate-400">View notifications</p>
          </button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
