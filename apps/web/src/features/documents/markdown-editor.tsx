'use client';

import { useState, useCallback } from 'react';

type MarkdownEditorProps = {
  initialContent?: string;
  onSave?: (content: string) => Promise<void>;
  isLoading?: boolean;
  onCursorChange?: (line: number, column: number) => void;
};

export function MarkdownEditor({
  initialContent = '',
  onSave,
  isLoading = false,
  onCursorChange,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  }, [content, onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!onCursorChange) return;

    const target = e.currentTarget;
    const text = target.value;
    const position = target.selectionStart;

    // Calculate line and column from position
    let line = 0;
    let column = 0;

    for (let i = 0; i < position; i++) {
      if (text[i] === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
    }

    onCursorChange(line, column);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Markdown Editor</h2>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <textarea
        value={content}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        placeholder="Enter your markdown content here..."
        className="min-h-[520px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-slate-50 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        disabled={isLoading || isSaving}
      />
    </div>
  );
}