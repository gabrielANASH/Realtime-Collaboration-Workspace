'use client';

import { useEffect, useState } from 'react';
import { CollaborativeEditor } from '@/features/documents/collaborative-editor';
import { DocumentPreview } from '@/features/documents/document-preview';
import { CommentSection } from '@/features/comments/comment-section';
import { useDocumentEditorStore } from '@/stores/document-editor-store';
import {
  useWorkspaceRoom,
  useWorkspacePresence,
  useUserCursor,
} from '@/hooks/use-realtime';

type DocumentPageProps = {
  params: Promise<{
    workspaceId: string;
    documentId: string;
  }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  const [resolved, setResolved] = useState<{ workspaceId: string; documentId: string } | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  const { isJoined } = useWorkspaceRoom(resolved?.workspaceId);
  const { users } = useWorkspacePresence(resolved?.workspaceId);
  const { remoteCursors } = useUserCursor(resolved?.workspaceId, resolved?.documentId);

  const content = useDocumentEditorStore((state) => state.content);

  if (!resolved) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
        <div className="mx-auto max-w-5xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Workspace {resolved.workspaceId}</p>
            <h1 className="text-4xl font-bold">Document Editor</h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2">
            <span className={`h-2 w-2 rounded-full ${isJoined ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isJoined ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>

        {users.length > 0 && (
          <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-sm font-medium text-slate-300">Active Users ({users.length})</p>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1 text-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <CollaborativeEditor
              documentId={resolved.documentId}
              workspaceId={resolved.workspaceId}
            />
          </div>

          <div>
            <DocumentPreview
              content={content}
              title="Document Preview"
              authorName={null}
              remoteCursors={remoteCursors}
            />
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <CommentSection
            workspaceId={resolved.workspaceId}
            documentId={resolved.documentId}
          />
        </div>
      </div>
    </main>
  );
}
