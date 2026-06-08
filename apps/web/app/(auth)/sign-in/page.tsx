'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInSchema, type SignInInput } from '@workspace/shared';
import { useAuthStore } from '@/stores/auth-store';
import { signInRequest } from '@/features/auth/auth-api';

type FieldErrors = Partial<Record<keyof SignInInput, string>>;

export default function SignInPage() {
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/workspaces';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError('');

    const result = signInSchema.safeParse({ email, password });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SignInInput;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const session = await signInRequest(result.data);
      setSession(session);
      window.location.href = redirectTo;
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-50">Sign in</h1>
          <p className="text-sm text-slate-400">Enter your credentials to continue</p>
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
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-slate-300">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none bg-white/5 ${
                fieldErrors.password ? 'border-red-500' : 'border-white/10 focus:border-brand-300'
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>
          <div className="text-right -mt-2">
            <a href="/forgot-password" className="text-xs text-brand-300 hover:underline">Forgot password?</a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-300 text-white py-2 text-sm font-medium hover:bg-brand-400 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-brand-300 hover:underline">Register</a>
        </p>
      </div>
    </main>
  );
}
