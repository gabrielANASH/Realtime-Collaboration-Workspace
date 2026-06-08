'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { listDocumentsRequest, createDocumentRequest } from '@/features/documents/document-api';

type Doc = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export default function DocumentsListPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!accessToken || !params.workspaceId) return;
    setLoading(true);
    listDocumentsRequest(params.workspaceId, accessToken)
      .then((r) => setDocs(r.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, params.workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !params.workspaceId) return;
    setCreating(true);
    setError('');
    try {
      const result = await createDocumentRequest(
        params.workspaceId,
        { title: newTitle, content: '' },
        accessToken,
      );
      const doc = result.document;
      router.push(`/workspaces/${params.workspaceId}/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Workspace {params.workspaceId}</p>
            <h1 className="text-3xl font-semibold">Documents</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowCreate(!showCreate); setError(''); }}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
            >
              {showCreate ? 'Cancel' : 'New Document'}
            </button>
            <button
              onClick={() => router.push(`/workspaces/${params.workspaceId}`)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm text-slate-300">Document Title</label>
              <input
                id="title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-brand-300"
                placeholder="Untitled Document"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50 transition-opacity"
            >
              {creating ? 'Creating...' : 'Create Document'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Loading documents...
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
            No documents yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() =>
                  router.push(`/workspaces/${params.workspaceId}/documents/${doc.id}`)
                }
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10 transition-colors"
              >
                <h3 className="text-lg font-medium text-slate-50">{doc.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
