'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { getMeRequest, updateProfileRequest, changePasswordRequest } from '@/features/auth/auth-api';

export default function SettingsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const storeUser = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await getMeRequest(accessToken);
      setName(result.user.name || '');
      setEmail(result.user.email);
      setCreatedAt(result.user.createdAt ?? null);
    } catch {
      setProfileError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const result = await updateProfileRequest({ name, email }, accessToken);
      useAuthStore.setState({ user: result.user as { id: string; email: string; name: string } });
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordSaving(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      await changePasswordRequest({ currentPassword, newPassword, confirmPassword }, accessToken);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-white/5" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-slate-50"
          >
            Back
          </button>
        </div>

        {profileSuccess && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
            Profile updated.
            <button onClick={() => setProfileSuccess(false)} className="ml-2 text-green-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {profileError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {profileError}
            <button onClick={() => setProfileError(null)} className="ml-2 text-red-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">Profile Information</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="settingsName" className="text-sm text-slate-400">
                Name
              </label>
              <input
                id="settingsName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settingsEmail" className="text-sm text-slate-400">
                Email
              </label>
              <input
                id="settingsEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={profileSaving || !email.trim()}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">Security</h2>
          {passwordSuccess && (
            <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-2 text-xs text-green-400">
              Password changed successfully.
            </div>
          )}
          {passwordError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
              {passwordError}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="currentPassword" className="text-sm text-slate-400">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-sm text-slate-400">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm text-slate-400">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-brand-300 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordSaving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-slate-400">Email</span>
              <span className="text-slate-50">{storeUser?.email || email}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-slate-400">Joined</span>
              <span className="text-slate-50">
                {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-slate-400">Account ID</span>
              <span className="font-mono text-xs text-slate-500">{storeUser?.id || '—'}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
