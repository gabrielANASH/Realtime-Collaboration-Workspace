'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { listWorkspacesRequest, createWorkspaceRequest } from '@/features/workspaces/workspace-api';
import { WorkspaceShell } from '@/features/workspaces/workspace-shell';

type Workspace = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
};

export default function WorkspacesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    listWorkspacesRequest(accessToken)
      .then((data) => setWorkspaces(data.workspaces))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setCreating(true);
    try {
      const result = await createWorkspaceRequest(
        { name: newName, description: newDesc || undefined },
        accessToken,
      );
      const ws = result.workspace;
      setWorkspaces((prev) => [...prev, { ...ws, role: 'admin' }]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      router.push(`/workspaces/${ws.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <WorkspaceShell title="Workspaces">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
          </p>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
          >
            {showCreate ? 'Cancel' : 'New Workspace'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm text-slate-300">Name</label>
              <input
                id="name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-brand-300"
                placeholder="My Workspace"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="desc" className="text-sm text-slate-300">Description</label>
              <input
                id="desc"
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-brand-300"
                placeholder="Optional description"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50 transition-opacity"
            >
              {creating ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300 text-center">
            No workspaces yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/workspaces/${ws.id}`)}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 transition-colors"
              >
                <h3 className="text-lg font-medium text-slate-50">{ws.name}</h3>
                <p className="mt-1 text-xs text-slate-500 capitalize">Role: {ws.role}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
