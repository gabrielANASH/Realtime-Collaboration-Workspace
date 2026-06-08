'use client';

import { useState, useRef, useCallback } from 'react';

type MentionMember = {
  id: string;
  name: string | null;
  email: string;
};

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  members: MentionMember[];
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
};

export function MentionInput({
  value,
  onChange,
  members,
  placeholder,
  disabled,
  onSubmit,
}: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = mentionQuery
    ? members.filter((m) =>
        m.name?.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : members;

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onChange(val);

      const pos = e.target.selectionStart;
      const before = val.slice(0, pos);
      const atIndex = before.lastIndexOf('@');

      if (atIndex !== -1) {
        const afterAt = before.slice(atIndex + 1);
        if (afterAt.length > 0 && !afterAt.includes(' ')) {
          setMentionQuery(afterAt);
          setMentionIndex(atIndex);
          return;
        }
      }
      setMentionQuery(null);
    },
    [onChange],
  );

  const insertMention = useCallback(
    (member: MentionMember) => {
      if (mentionIndex === null) return;
      const displayName = member.name || member.email.split('@')[0];
      const before = value.slice(0, mentionIndex);
      const after = value.slice(mentionIndex + (mentionQuery?.length ?? 0) + 1);
      const newVal = `${before}@${displayName} ${after}`;
      onChange(newVal);
      setMentionQuery(null);
      textareaRef.current?.focus();
    },
    [mentionIndex, mentionQuery, onChange, value],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery !== null && filtered.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionIndex((prev) =>
            prev === null ? 0 : Math.min(filtered.length - 1, prev + 1),
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionIndex((prev) =>
            prev === null ? filtered.length - 1 : Math.max(0, prev - 1),
          );
          return;
        }
        if (e.key === 'Enter' && mentionIndex !== null && filtered[mentionIndex]) {
          e.preventDefault();
          insertMention(filtered[mentionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          setMentionQuery(null);
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    },
    [mentionQuery, filtered, mentionIndex, insertMention, onSubmit],
  );

  const handleDropdownSelect = useCallback(
    (member: MentionMember) => {
      insertMention(member);
    },
    [insertMention],
  );

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Write a comment... (use @ to mention someone)'}
        disabled={disabled}
        rows={3}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      />
      {mentionQuery !== null && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl"
        >
          {filtered.map((member, i) => (
            <button
              key={member.id}
              onClick={() => handleDropdownSelect(member)}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                mentionIndex === i
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="font-medium">{member.name || member.email.split('@')[0]}</span>
              <span className="ml-2 text-xs text-slate-500">{member.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
