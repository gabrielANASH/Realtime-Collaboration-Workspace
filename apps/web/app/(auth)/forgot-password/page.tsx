'use client';

import { useState } from 'react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@workspace/shared';
import { forgotPasswordRequest } from '@/features/auth/auth-api';

type FieldErrors = Partial<Record<keyof ForgotPasswordInput, string>>;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError('');

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordInput;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordRequest(result.data);
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      }
      setSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-50">Check your email</h1>
            <p className="text-sm text-slate-400">
              If an account with that email exists, we have sent a password reset link.
            </p>
          </div>
          {resetUrl && (
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-slate-400 break-all">
              <p className="text-slate-300 text-sm mb-1">Dev mode — reset link:</p>
              <a href={resetUrl} className="text-brand-300 hover:underline">{resetUrl}</a>
            </div>
          )}
          <a
            href="/sign-in"
            className="inline-block rounded-lg bg-brand-300 text-white py-2 px-4 text-sm font-medium hover:bg-brand-400 transition-colors"
          >
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-50">Forgot password</h1>
          <p className="text-sm text-slate-400">Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {serverError}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-slate-300">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none bg-white/5 ${
                fieldErrors.email ? 'border-red-500' : 'border-white/10 focus:border-brand-300'
              }`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-300 text-white py-2 text-sm font-medium hover:bg-brand-400 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          <a href="/sign-in" className="text-brand-300 hover:underline">Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
