'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DocumentEdit } from '@workspace/shared';
import { applyOperation } from '@/lib/operational-transform';

export type DocumentEditStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

export interface DocumentEditorState {
  // Document content & versioning
  documentId: string | null;
  workspaceId: string | null;
  content: string;
  version: number;
  lastSavedVersion: number;
  savedContent: string;

  // Edit tracking
  pendingEdits: DocumentEdit[];
  unacknowledgedEdits: DocumentEdit[];
  remoteEdits: DocumentEdit[];

  // UI state
  status: DocumentEditStatus;
  errorMessage: string | null;
  conflictInfo: { serverVersion: number; serverContent: string } | null;

  // Cursor & selection
  cursorPosition: number;
  selectionStart: number | null;
  selectionEnd: number | null;

  // Remote collaborators
  collaborators: Map<string, { userId: string; name: string; position: number; lastEdited: Date }>;

  // Actions
  initializeDocument: (
    documentId: string,
    workspaceId: string,
    content: string,
    version: number,
  ) => void;

  addEdit: (edit: DocumentEdit) => void;
  addRemoteEdit: (edit: DocumentEdit) => void;
  clearPendingEdits: () => void;

  setStatus: (status: DocumentEditStatus, errorMessage?: string) => void;
  setConflict: (conflict: { serverVersion: number; serverContent: string } | null) => void;
  resolveConflict: (strategy: 'accept-local' | 'accept-remote' | 'merge') => void;

  updateCursorPosition: (position: number) => void;
  updateSelection: (start: number | null, end: number | null) => void;

  recordSave: (version: number, editsApplied: number) => void;
  updateCollaborator: (userId: string, name: string, position: number) => void;
  removeCollaborator: (userId: string) => void;

  // Utilities
  setLocalEdit: (content: string) => void;
  getContent: () => string;
  getVersion: () => number;
  hasPendingChanges: () => boolean;
  isDirty: () => boolean;
  reset: () => void;
}

const initialState = {
  documentId: null,
  workspaceId: null,
  content: '',
  version: 0,
  lastSavedVersion: 0,
  savedContent: '',
  pendingEdits: [],
  unacknowledgedEdits: [],
  remoteEdits: [],
  status: 'idle' as const,
  errorMessage: null,
  conflictInfo: null,
  cursorPosition: 0,
  selectionStart: null,
  selectionEnd: null,
  collaborators: new Map(),
};

export const useDocumentEditorStore = create<DocumentEditorState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      initializeDocument: (documentId, workspaceId, content, version) => {
        set({
          documentId,
          workspaceId,
          content,
          version,
          lastSavedVersion: version,
          savedContent: content,
          pendingEdits: [],
          unacknowledgedEdits: [],
          remoteEdits: [],
          status: 'idle',
          errorMessage: null,
          conflictInfo: null,
        });
      },

      setLocalEdit: (content) => {
        set({ content });
      },

      addEdit: (edit) => {
        const state = get();
        set({
          pendingEdits: [...state.pendingEdits, edit],
          unacknowledgedEdits: [...state.unacknowledgedEdits, edit],
          version: state.version + 1,
          status: 'pending',
        });
      },

      addRemoteEdit: (edit) => {
        const state = get();
        set({
          content: applyOperation(state.content, edit),
          version: state.version + 1,
        });
      },

      clearPendingEdits: () => {
        set({
          pendingEdits: [],
          unacknowledgedEdits: [],
          remoteEdits: [],
        });
      },

      setStatus: (status, errorMessage?: string) => {
        set({ status, errorMessage: errorMessage ?? null });
      },

      setConflict: (conflictInfo) => {
        set({
          conflictInfo,
          status: conflictInfo ? 'conflict' : 'idle',
        });
      },

      resolveConflict: (strategy) => {
        const state = get();

        if (strategy === 'accept-local') {
          // Keep local changes, discard server version
          set({
            conflictInfo: null,
            status: 'pending',
            version: state.version + 1,
          });
        } else if (strategy === 'accept-remote') {
          // Accept server version, discard local changes
          if (state.conflictInfo) {
            set({
              content: state.conflictInfo.serverContent,
              version: state.conflictInfo.serverVersion,
              lastSavedVersion: state.conflictInfo.serverVersion,
              savedContent: state.conflictInfo.serverContent,
              pendingEdits: [],
              unacknowledgedEdits: [],
              conflictInfo: null,
              status: 'saved',
            });
          }
        } else if (strategy === 'merge') {
          // Merge local and remote (simplified: local overwrites remote)
          set({
            conflictInfo: null,
            status: 'pending',
          });
        }
      },

      updateCursorPosition: (position) => {
        set({ cursorPosition: position });
      },

      updateSelection: (start, end) => {
        set({ selectionStart: start, selectionEnd: end });
      },

      recordSave: (version, editsApplied) => {
        const state = get();
        set({
          lastSavedVersion: version,
          version,
          status: 'saved',
          pendingEdits: state.pendingEdits.slice(editsApplied),
          unacknowledgedEdits: [],
        });
      },

      updateCollaborator: (userId, name, position) => {
        const state = get();
        const collaborators = new Map(state.collaborators);
        collaborators.set(userId, {
          userId,
          name,
          position,
          lastEdited: new Date(),
        });
        set({ collaborators });
      },

      removeCollaborator: (userId) => {
        const state = get();
        const collaborators = new Map(state.collaborators);
        collaborators.delete(userId);
        set({ collaborators });
      },

      getContent: () => get().content,
      getVersion: () => get().version,

      hasPendingChanges: () => {
        const state = get();
        return state.pendingEdits.length > 0;
      },

      isDirty: () => {
        const state = get();
        return state.version !== state.lastSavedVersion;
      },

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'DocumentEditorStore' },
  ),
);
