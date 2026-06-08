'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPasswordSchema, type ResetPasswordInput } from '@workspace/shared';
import { resetPasswordRequest } from '@/features/auth/auth-api';

type FieldErrors = Partial<Record<keyof ResetPasswordInput, string>>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError('');

    const result = resetPasswordSchema.safeParse({ token, password, confirmPassword });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await resetPasswordRequest(result.data);
      setSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-50">Password reset</h1>
            <p className="text-sm text-slate-400">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <a
            href="/sign-in"
            className="inline-block rounded-lg bg-brand-300 text-white py-2 px-4 text-sm font-medium hover:bg-brand-400 transition-colors"
          >
            Sign in
          </a>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-50">Invalid link</h1>
            <p className="text-sm text-slate-400">
              This password reset link is invalid or missing a token.
            </p>
          </div>
          <a
            href="/forgot-password"
            className="inline-block rounded-lg bg-brand-300 text-white py-2 px-4 text-sm font-medium hover:bg-brand-400 transition-colors"
          >
            Request new link
          </a>
        </div>
      </main>
    );
  }

  const inputClass = (field: keyof FieldErrors) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none bg-white/5 ${
      fieldErrors[field] ? 'border-red-500' : 'border-white/10 focus:border-brand-300'
    }`;

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-50">Reset password</h1>
          <p className="text-sm text-slate-400">Enter your new password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {serverError}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-slate-300">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass('password')}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm text-slate-300">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass('confirmPassword')}
              placeholder="••••••••"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-300 text-white py-2 text-sm font-medium hover:bg-brand-400 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          <a href="/sign-in" className="text-brand-300 hover:underline">Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
