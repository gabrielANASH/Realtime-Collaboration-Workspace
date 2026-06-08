'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { registerSchema, type RegisterInput } from '@workspace/shared';
import { useAuthStore } from '@/stores/auth-store';
import { registerRequest } from '@/features/auth/auth-api';

type FieldErrors = Partial<Record<keyof RegisterInput | 'confirmPassword', string>>;

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/workspaces';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError('');

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    const input: RegisterInput = {
      name: name || undefined,
      email,
      password,
    };

    const result = registerSchema.safeParse(input);

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterInput;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const session = await registerRequest(result.data);
      setSession(session);
      window.location.href = redirectTo;
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none bg-white/5 ${
      fieldErrors[field] ? 'border-red-500' : 'border-white/10 focus:border-brand-300'
    }`;

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-50">Create an account</h1>
          <p className="text-sm text-slate-400">Fill in the details to get started</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {serverError}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm text-slate-300">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass('name')}
              placeholder="Your name"
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-400">{fieldErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-slate-300">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass('email')}
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
              className={inputClass('password')}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm text-slate-300">Confirm Password</label>
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <a href="/sign-in" className="text-brand-300 hover:underline">Sign in</a>
        </p>
      </div>
    </main>
  );
}
