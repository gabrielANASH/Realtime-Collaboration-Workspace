'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { WorkspaceShell } from '@/features/workspaces/workspace-shell';
import {
  getWorkspaceRequest,
  updateWorkspaceRequest,
  deleteWorkspaceRequest,
  listMembersRequest,
} from '@/features/workspaces/workspace-api';

function isManager(role: string | undefined): role is 'owner' | 'admin' {
  return role === 'owner' || role === 'admin';
}

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const workspaceId = params.workspaceId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currentRole, setCurrentRole] = useState<string | undefined>();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const [wsResult, membersResult] = await Promise.all([
        getWorkspaceRequest(workspaceId, accessToken),
        listMembersRequest(workspaceId, accessToken),
      ]);
      setName(wsResult.workspace.name);
      setDescription(wsResult.workspace.description || '');
      const currentMember = membersResult.members.find((m) => m.userId === currentUserId);
      setCurrentRole(currentMember?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canManage = isManager(currentRole);
  const isOwner = currentRole === 'owner';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !workspaceId) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await updateWorkspaceRequest(
        workspaceId,
        { name, description: description || null },
        accessToken,
      );
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !workspaceId || deleteConfirmName !== name) return;
    setDeleting(true);
    try {
      await deleteWorkspaceRequest(workspaceId, accessToken);
      router.push('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <WorkspaceShell title="Settings">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
          <div className="h-20 w-full animate-pulse rounded-lg bg-white/5" />
        </div>
      </WorkspaceShell>
    );
  }

  if (error) {
    return (
      <WorkspaceShell title="Settings">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  if (!canManage) {
    return (
      <WorkspaceShell title="Settings">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
            You do not have permission to access workspace settings.
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title="Settings">
      <div className="mx-auto max-w-2xl space-y-8">
        {saveSuccess && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
            Settings saved.
            <button onClick={() => setSaveSuccess(false)} className="ml-2 text-green-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {saveError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {saveError}
            <button onClick={() => setSaveError(null)} className="ml-2 text-red-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <section>
          <h2 className="mb-4 text-lg font-medium">General Settings</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="workspaceName" className="text-sm text-slate-400">
                Workspace Name
              </label>
              <input
                id="workspaceName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="workspaceDescription" className="text-sm text-slate-400">
                Description
              </label>
              <textarea
                id="workspaceDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {isOwner && (
          <section className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6">
            <h2 className="mb-1 text-lg font-medium text-red-400">Danger Zone</h2>
            <p className="mb-4 text-sm text-slate-400">
              Once you delete a workspace, there is no going back. Please be certain.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Delete Workspace
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-300">
                  Type <strong className="text-slate-50">{name}</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={name}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-red-400 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirmName !== name || deleting}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmName('');
                    }}
                    disabled={deleting}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}
