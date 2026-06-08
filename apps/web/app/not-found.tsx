import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-6xl font-bold text-slate-50 mb-2">404</h1>
          <p className="text-sm text-slate-400 mb-6">Page not found</p>
          <Link
            href="/workspaces"
            className="inline-block rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Back to workspaces
          </Link>
        </div>
      </div>
    </main>
  );
}
