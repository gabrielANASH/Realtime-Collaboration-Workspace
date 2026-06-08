'use client';

import { useCallback, useRef, useState } from 'react';
import { useCollaborativeDocument } from '@/hooks/use-collaborative-document';

interface CollaborativeEditorProps {
  documentId: string;
  workspaceId: string;
  initialContent?: string;
}

/**
 * Collaborative document editor with real-time synchronization
 * Integrates with the collaboration hook for debounced persistence and Socket.io broadcasting
 */
export function CollaborativeEditor({ documentId, workspaceId, initialContent = '' }: CollaborativeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const {
    content,
    version,
    status,
    isLoading,
    isDirty,
    hasPendingChanges,
    insertText,
    deleteText,
    forcePersist,
    collaborators,
    conflictInfo,
    resolveConflict,
  } = useCollaborativeDocument(documentId, workspaceId);

  // Handle text input
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isComposing) return;

      const newContent = e.target.value;

      // Find diff boundaries by scanning from both ends
      let diffStart = 0;
      while (
        diffStart < content.length &&
        diffStart < newContent.length &&
        content[diffStart] === newContent[diffStart]
      ) {
        diffStart++;
      }

      let diffEndOld = content.length - 1;
      let diffEndNew = newContent.length - 1;
      while (
        diffEndOld >= diffStart &&
        diffEndNew >= diffStart &&
        content[diffEndOld] === newContent[diffEndNew]
      ) {
        diffEndOld--;
        diffEndNew--;
      }

      const deletedLength = diffEndOld - diffStart + 1;
      const insertedText = newContent.slice(diffStart, diffEndNew + 1);

      if (deletedLength > 0) {
        deleteText(diffStart, deletedLength);
      }
      if (insertedText.length > 0) {
        insertText(diffStart, insertedText);
      }
    },
    [content, insertText, deleteText, isComposing],
  );

  // Handle composition events (for IME input)
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    handleChange(e as unknown as React.ChangeEvent<HTMLTextAreaElement>);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Force save on Ctrl/Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        forcePersist();
      }
    },
    [forcePersist],
  );

  // Sync textarea content with store
  const syncContent = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.value = content;
    }
  }, [content]);

  // Status badge styling
  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'bg-blue-100 text-blue-800';
      case 'saved':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'conflict':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with status and controls */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor()}`}>
            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'error' ? 'Error' : status === 'conflict' ? 'Conflict' : 'Idle'}
          </span>

          {isDirty && <span className="text-sm text-gray-600">• Unsaved changes</span>}

          {hasPendingChanges && <span className="text-sm text-blue-600">• Pending edits</span>}

          {version > 0 && <span className="text-xs text-gray-500">v{version}</span>}
        </div>

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Editing:</span>
            <div className="flex gap-1">
              {collaborators.map((collaborator, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold"
                  title={collaborator.userId}
                >
                  {collaborator.name.substring(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conflict resolution dialog */}
      {conflictInfo && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-yellow-900">Document Conflict</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Another user modified this document. Please choose how to resolve the conflict.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resolveConflict('accept-local')}
                className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Keep My Changes
              </button>
              <button
                onClick={() => resolveConflict('accept-remote')}
                className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Accept Their Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        onFocus={syncContent}
        disabled={isLoading}
        className="flex-1 p-4 border-0 focus:outline-none focus:ring-0 font-mono text-sm resize-none"
        placeholder="Start typing..."
        spellCheck="false"
      />

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
        <div>{content.length} characters</div>
        {isLoading && <span>Loading document...</span>}
      </div>
    </div>
  );
}
