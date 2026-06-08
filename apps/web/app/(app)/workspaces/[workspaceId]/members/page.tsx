'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { WorkspaceShell } from '@/features/workspaces/workspace-shell';
import {
  listMembersRequest,
  inviteMemberRequest,
  removeMemberRequest,
  updateMemberRoleRequest,
} from '@/features/workspaces/workspace-api';

type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
};

function isManager(role: string | undefined): role is 'owner' | 'admin' {
  return role === 'owner' || role === 'admin';
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full control. Can manage settings, members, and content.',
  admin: 'Can manage members and content. Cannot delete workspace.',
  member: 'Can create and edit documents.',
  viewer: 'Can only view documents and activity.',
};

export default function MembersPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [actionFeedback, setActionFeedback] = useState('');

  const currentMember = members.find((m) => m.userId === currentUserId);
  const currentRole = currentMember?.role;
  const canManage = isManager(currentRole);

  const fetchMembers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await listMembersRequest(params.workspaceId, accessToken);
      setMembers(data.members as Member[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [params.workspaceId, accessToken]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const clearFeedback = () => setActionFeedback('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setInviteError('');
    setInviting(true);
    try {
      await inviteMemberRequest(
        params.workspaceId,
        { email: inviteEmail, role: inviteRole as 'admin' | 'member' | 'viewer' },
        accessToken,
      );
      setInviteEmail('');
      setInviteRole('member');
      setShowInvite(false);
      setActionFeedback('Member invited successfully.');
      fetchMembers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!accessToken || !canManage) return;
    if (!confirm(`Remove ${name || 'this member'} from the workspace? This action cannot be undone.`))
      return;
    try {
      await removeMemberRequest(params.workspaceId, userId, accessToken);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setActionFeedback('Member removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRoleChange = async (userId: string, role: string, memberName: string) => {
    if (!accessToken || !canManage) return;
    if (!confirm(`Change ${memberName || 'this member'}'s role to ${role}?`)) return;
    try {
      const prev = members.find((m) => m.userId === userId)?.role;
      setMembers((prevMembers) =>
        prevMembers.map((m) => (m.userId === userId ? { ...m, role: role as Member['role'] } : m)),
      );
      await updateMemberRoleRequest(
        params.workspaceId,
        userId,
        { role: role as 'admin' | 'member' | 'viewer' },
        accessToken,
      );
      setActionFeedback(`Role changed to ${role}.`);
    } catch (err) {
      fetchMembers();
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleLeave = async () => {
    if (!accessToken || !currentUserId || currentRole === 'owner') return;
    if (
      !confirm(
        'Leave this workspace? You will lose access to all documents and will need an invitation to rejoin.',
      )
    )
      return;
    try {
      await removeMemberRequest(params.workspaceId, currentUserId, accessToken);
      router.push('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave workspace');
    }
  };

  const assignableRoles = currentRole === 'owner' ? ['admin', 'member', 'viewer'] : ['member', 'viewer'];

  return (
    <WorkspaceShell title="Members" workspaceId={params.workspaceId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
          <div className="flex gap-2">
            {currentRole && currentRole !== 'owner' && (
              <button
                onClick={handleLeave}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Leave Workspace
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
              >
                {showInvite ? 'Cancel' : 'Invite Member'}
              </button>
            )}
          </div>
        </div>

        {actionFeedback && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
            {actionFeedback}
            <button onClick={clearFeedback} className="ml-2 text-green-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {showInvite && canManage && (
          <form onSubmit={handleInvite} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            {inviteError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                {inviteError}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-slate-300">Email</label>
              <input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-brand-300"
                placeholder="colleague@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="inviteRole" className="text-sm text-slate-300">Role</label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-brand-300"
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">{ROLE_DESCRIPTIONS[inviteRole]}</p>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50 transition-opacity"
            >
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300 text-center">
            No members yet.
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const isOwner = member.role === 'owner';
              const canChangeRole = canManage && !isSelf && !isOwner;
              const canRemoveMember = canManage && !isSelf && !isOwner;

              return (
                <div
                  key={member.userId}
                  className={`flex items-center justify-between rounded-2xl border p-4 ${
                    isSelf ? 'border-brand-300/20 bg-brand-300/[0.03]' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300 text-sm font-bold text-white">
                      {((member.name ?? member.email)[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-50 truncate">
                        {member.name || 'Unnamed'}
                        {isSelf && <span className="ml-1.5 text-[10px] text-slate-500">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {canChangeRole && (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value, member.name ?? member.email)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-300"
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    )}
                    {!canChangeRole && (
                      <span className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 text-xs text-slate-500">
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    )}
                    {canRemoveMember && (
                      <button
                        onClick={() => handleRemove(member.userId, member.name ?? member.email)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentRole && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Your Role</h3>
            <p className="text-sm text-slate-50 capitalize">
              {currentRole}
              {currentRole === 'owner' && <span className="text-xs text-slate-400 ml-2">(workspace owner)</span>}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{ROLE_DESCRIPTIONS[currentRole]}</p>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
