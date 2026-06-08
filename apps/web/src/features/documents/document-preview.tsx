'use client';

import { useMemo } from 'react';

type DocumentPreviewProps = {
  content: string;
  title: string;
  authorName?: string | null;
  remoteCursors?: Array<{ userId: string; line: number; column: number; color: string }>;
};

export function DocumentPreview({
  content,
  title,
  authorName,
  remoteCursors = [],
}: DocumentPreviewProps) {
  const htmlContent = useMemo(() => {
    const lines = content.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeLanguage = '';

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          html += '</pre>';
          inCodeBlock = false;
        } else {
          codeLanguage = line.slice(3).trim();
          html += '<pre>';
          inCodeBlock = true;
        }
      } else if (inCodeBlock) {
        html += `${line}\n`;
      } else if (line.startsWith('# ')) {
        html += `<h1 class="text-2xl font-bold">${line.slice(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2 class="text-xl font-bold">${line.slice(3)}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3 class="text-lg font-bold">${line.slice(4)}</h3>`;
      } else if (line.startsWith('- ')) {
        html += `<li>${line.slice(2)}</li>`;
      } else if (line.trim()) {
        html += `<p>${line}</p>`;
      }
    }

    if (inCodeBlock) {
      html += '</pre>';
    }

    return html;
  }, [content]);

  return (
    <aside className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
      <div className="mb-4 border-b border-white/10 pb-4">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        {authorName && <p className="text-xs text-slate-400">By {authorName}</p>}
      </div>

      <div className="prose prose-invert max-w-none space-y-3 text-slate-300">
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>

      {/* Remote cursors display */}
      {remoteCursors.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-400">Collaborators Online</p>
          <div className="space-y-2">
            {remoteCursors.map((cursor) => (
              <div
                key={cursor.userId}
                className="flex items-center gap-2 text-xs"
              >
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: cursor.color }}
                />
                <span className="text-slate-400">
                  Line {cursor.line}, Column {cursor.column}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}