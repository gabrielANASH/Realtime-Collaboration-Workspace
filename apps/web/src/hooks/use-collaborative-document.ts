'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentEditorStore } from '@/stores/document-editor-store';
import { useAuthStore } from '@/stores/auth-store';
import { getSocket } from '@/lib/socket-client';
import {
  transformOperationSequence,
  applyOperation,
  calculateNewPosition,
} from '@/lib/operational-transform';
import type { DocumentEdit } from '@workspace/shared';

/**
 * Hook for collaborative document editing
 * Handles:
 * - Local edit tracking
 * - Optimistic UI updates
 * - Debounced persistence
 * - Conflict resolution
 * - Real-time synchronization
 */
export function useCollaborativeDocument(documentId: string, workspaceId: string) {
  const userId = useAuthStore((state) => state.user?.id);
  const userName = useAuthStore((state) => state.user?.name || 'Unknown');
  const accessToken = useAuthStore((state) => state.accessToken);

  const editorStore = useDocumentEditorStore();
  const [isLoading, setIsLoading] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);
  const lastPersistTimeRef = useRef<number>(0);
  const broadcastTimerRef = useRef<NodeJS.Timeout>(undefined);
  const broadcastQueueRef = useRef<{ edit: DocumentEdit; version: number }[]>([]);
  const editorStoreRef = useRef(editorStore);
  // eslint-disable-next-line react-hooks/refs
  editorStoreRef.current = editorStore;

  // Load initial document content (runs only when documentId, workspaceId, or accessToken changes)
  useEffect(() => {
    if (!documentId || !accessToken) return;

    const store = editorStoreRef.current;

    let cancelled = false;
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/documents/${documentId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const doc = data.document;
          store.initializeDocument(
            documentId,
            workspaceId,
            doc.content,
            doc.version || 0,
          );
        } else {
          store.setStatus('error', 'Failed to load document');
        }
      } catch {
        store.setStatus('error', 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
    return () => { cancelled = true; };
  }, [documentId, workspaceId, accessToken]);

  // Listen for remote edits via Socket.io
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !documentId) return;

    const handleRemoteEdit = (data: {
      documentId: string;
      edit: DocumentEdit;
      version: number;
      userId: string;
      userName: string;
    }) => {
      if (data.documentId !== documentId) return;

      // Apply remote edit to our local version
      editorStore.addRemoteEdit(data.edit);

      // Track collaborator position
      if (data.userId !== userId) {
        editorStore.updateCollaborator(data.userId, data.userName, data.edit.position);
      }
    };

    const handleDocumentSaved = (data: {
      documentId: string;
      version: number;
      editsApplied: number;
      timestamp: string;
    }) => {
      if (data.documentId !== documentId) return;

      editorStore.recordSave(data.version, data.editsApplied);
    };

    const handleDocumentConflict = (data: {
      documentId: string;
      serverVersion: number;
      serverContent: string;
      conflictingEdits: DocumentEdit[];
    }) => {
      if (data.documentId !== documentId) return;

      editorStore.setConflict({
        serverVersion: data.serverVersion,
        serverContent: data.serverContent,
      });
    };

    socket.on('document:edit-remote', handleRemoteEdit);
    socket.on('document:saved', handleDocumentSaved);
    socket.on('document:conflict', handleDocumentConflict);

    return () => {
      socket.off('document:edit-remote', handleRemoteEdit);
      socket.off('document:saved', handleDocumentSaved);
      socket.off('document:conflict', handleDocumentConflict);
    };
  }, [documentId, userId]);

  /**
   * Add a local edit (keystroke)
   * Optimistic: apply immediately, persist on debounce timer
   */
  const insertText = useCallback(
    (position: number, text: string) => {
      if (!userId) return;

      const edit: DocumentEdit = {
        type: 'insert',
        position,
        content: text,
        timestamp: Date.now(),
        userId,
      };

      // Apply optimistically to local state
      const currentContent = editorStore.getContent();
      const newContent = currentContent.slice(0, position) + text + currentContent.slice(position);

      editorStore.setLocalEdit(newContent);
      editorStore.addEdit(edit);

      // Broadcast to other users immediately (throttled)
      broadcastEdit(edit);

      // Schedule persistence on debounce timer
      schedulePersistence();
    },
    [documentId, workspaceId, userId, editorStore],
  );

  /**
   * Delete text
   */
  const deleteText = useCallback(
    (position: number, length: number) => {
      if (!userId) return;

      const edit: DocumentEdit = {
        type: 'delete',
        position,
        content: '',
        length,
        timestamp: Date.now(),
        userId,
      };

      // Apply optimistically
      const currentContent = editorStore.getContent();
      const newContent = currentContent.slice(0, position) + currentContent.slice(position + length);

      editorStore.setLocalEdit(newContent);
      editorStore.addEdit(edit);

      // Broadcast and schedule persistence
      broadcastEdit(edit);
      schedulePersistence();
    },
    [documentId, workspaceId, userId, editorStore],
  );

  /**
   * Broadcast edit to other users via Socket.io
   */
  const broadcastEdit = useCallback(
    (edit: DocumentEdit) => {
      const socket = getSocket();
      if (!socket) return;

      // Queue edit with the version at call time
      broadcastQueueRef.current.push({ edit, version: editorStore.getVersion() });

      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current);
      }

      broadcastTimerRef.current = setTimeout(() => {
        const queue = broadcastQueueRef.current;
        broadcastQueueRef.current = [];
        for (const item of queue) {
          socket.emit('document:edit', {
            documentId,
            workspaceId,
            edit: item.edit,
            version: item.version,
            userId,
            userName,
          });
        }
      }, 100);
    },
    [documentId, workspaceId, userId, userName, editorStore],
  );

  /**
   * Persist pending edits to backend
   * Debounced to batch multiple edits
   */
  const persistEdits = useCallback(async () => {
    if (!accessToken || !userId) return;

    const pendingEdits = editorStore.pendingEdits;
    if (pendingEdits.length === 0) return;

    editorStore.setStatus('saving');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/documents/${documentId}/collaborate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            edits: pendingEdits,
            baseVersion: editorStore.lastSavedVersion,
            currentVersion: editorStore.version,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        editorStore.recordSave(result.version, result.savedEdits);
        lastPersistTimeRef.current = Date.now();
      } else if (response.status === 409) {
        // Conflict
        const conflict = await response.json();
        editorStore.setConflict({
          serverVersion: conflict.serverVersion,
          serverContent: conflict.serverContent,
        });
      } else {
        editorStore.setStatus('error', 'Failed to save changes');
      }
    } catch (error) {
      editorStore.setStatus('error', error instanceof Error ? error.message : 'Save failed');
    }
  }, [documentId, workspaceId, userId, accessToken, editorStore]);

  /**
   * Schedule persistence with debouncing
   * Waits 5 seconds of inactivity before persisting
   */
  const schedulePersistence = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistEdits();
    }, 5000); // 5 second debounce
  }, [persistEdits]);

  /**
   * Force immediate persistence
   * Called on document blur, page unload, etc.
   */
  const forcePersist = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistEdits();
  }, [persistEdits]);

  /**
   * Handle window unload - persist pending edits via sendBeacon
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const store = editorStoreRef.current;
      if (store.isDirty()) {
        const pendingEdits = store.pendingEdits;
        if (pendingEdits.length > 0) {
          const body = JSON.stringify({
            edits: pendingEdits,
            baseVersion: store.lastSavedVersion,
            currentVersion: store.version,
          });
          navigator.sendBeacon(
            `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/documents/${documentId}/collaborate`,
            new Blob([body], { type: 'application/json' }),
          );
        }
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (broadcastTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [documentId, workspaceId]);

  return {
    // Content
    content: editorStore.content,
    version: editorStore.version,
    lastSavedVersion: editorStore.lastSavedVersion,

    // State
    status: editorStore.status,
    isLoading,
    isDirty: editorStore.isDirty(),
    hasPendingChanges: editorStore.hasPendingChanges(),

    // Conflict
    conflictInfo: editorStore.conflictInfo,
    resolveConflict: editorStore.resolveConflict,

    // Editing
    insertText,
    deleteText,
    forcePersist,

    // Collaborators
    collaborators: Array.from(editorStore.collaborators.values()),

    // Cursor
    updateCursor: editorStore.updateCursorPosition,
    cursorPosition: editorStore.cursorPosition,
  };
}
