'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-400 mb-6">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Try again
          </button>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-600 font-mono">Error ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
