import { describe, it, expect } from 'vitest';
import { AuthService } from '../../auth/auth.service';
import { CommentsService } from '../comments.service';

describe('AuthService.generateMentionKey', () => {
  it('generates mentionKey from email local-part', () => {
    expect(AuthService.generateMentionKey('maddygabriel10@gmail.com')).toBe('maddygabriel10');
    expect(AuthService.generateMentionKey('john.doe@example.com')).toBe('johndoe');
    expect(AuthService.generateMentionKey('alice-smith@test.com')).toBe('alicesmith');
  });

  it('lowercases the local-part', () => {
    expect(AuthService.generateMentionKey('TestUser@Example.com')).toBe('testuser');
    expect(AuthService.generateMentionKey('JOHN.DOE@EXAMPLE.COM')).toBe('johndoe');
  });

  it('removes non-word characters from local-part', () => {
    expect(AuthService.generateMentionKey('user+spam@example.com')).toBe('userspam');
    expect(AuthService.generateMentionKey('user.name+tag@example.com')).toBe('usernametag');
    expect(AuthService.generateMentionKey('a.b_c@x.com')).toBe('ab_c');
  });

  it('handles emails where local-part becomes empty', () => {
    const key = AuthService.generateMentionKey('@example.com');
    expect(key).toMatch(/^user_/);
  });

  it('handles single-character local-parts', () => {
    expect(AuthService.generateMentionKey('a@b.com')).toBe('a');
  });

  it('handles emails with numbers in local-part', () => {
    expect(AuthService.generateMentionKey('user123@domain.com')).toBe('user123');
    expect(AuthService.generateMentionKey('123user@domain.com')).toBe('123user');
  });
});

describe('CommentsService.parseMentions', () => {
  const commentsService = new CommentsService();

  it('extracts single-word mentions', () => {
    expect(commentsService.parseMentions('Hello @john')).toEqual(['john']);
  });

  it('extracts multiple mentions', () => {
    const result = commentsService.parseMentions('@alice @bob check this');
    expect(result).toContain('alice');
    expect(result).toContain('bob');
    expect(result.length).toBe(2);
  });

  it('extracts @mention that appears after an @ symbol (e.g. email)', () => {
    const result = commentsService.parseMentions('email@example.com');
    expect(result).toContain('example');
  });

  it('handles mentions with underscores and numbers', () => {
    expect(commentsService.parseMentions('Hey @john_doe123')).toEqual(['john_doe123']);
  });

  it('returns empty array for text with no mentions', () => {
    expect(commentsService.parseMentions('Hello world')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(commentsService.parseMentions('')).toEqual([]);
  });

  it('deduplicates repeated mentions', () => {
    const result = commentsService.parseMentions('@john @john @john');
    expect(result).toEqual(['john']);
  });

  it('handles mentions at the start of text', () => {
    expect(commentsService.parseMentions('@john look here')).toEqual(['john']);
  });

  it('handles mentions at the end of text', () => {
    expect(commentsService.parseMentions('look here @john')).toEqual(['john']);
  });

  it('handles punctuation after mentions', () => {
    expect(commentsService.parseMentions('@john, please check')).toEqual(['john']);
    expect(commentsService.parseMentions('@john!')).toEqual(['john']);
    expect(commentsService.parseMentions('Hello @john.')).toEqual(['john']);
  });

  it('handles multi-word display names — breaks at space', () => {
    expect(commentsService.parseMentions('@JohnDoe is here')).toEqual(['JohnDoe']);
  });
});

describe('Mention matching logic', () => {
  const commentsService = new CommentsService();

  const members = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', mentionKey: 'alice' },
    { id: '2', name: 'Bob', email: 'bob@example.com', mentionKey: 'bob' },
    { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', mentionKey: 'charlie' },
    { id: '4', name: 'Gabriel Ebenezer A', email: 'maddygabriel10@gmail.com', mentionKey: 'maddygabriel10' },
  ];

  it('matches single-word mentionKeys correctly', () => {
    const keys = commentsService.parseMentions('Hey @bob');
    const matched = members.filter((m) => keys.some((k) => m.mentionKey?.toLowerCase() === k.toLowerCase()));
    expect(matched).toHaveLength(1);
    expect(matched[0]!.id).toBe('2');
  });

  it('matches multi-word user names via mentionKey (first example)', () => {
    const keys = commentsService.parseMentions('Thanks @maddygabriel10');
    const matched = members.filter((m) => keys.some((k) => m.mentionKey?.toLowerCase() === k.toLowerCase()));
    expect(matched).toHaveLength(1);
    expect(matched[0]!.id).toBe('4');
  });

  it('does not match by full display name — mentionKey required', () => {
    const keys = commentsService.parseMentions('Hey @AliceSmith');
    const matched = members.filter((m) => keys.some((k) => m.mentionKey?.toLowerCase() === k.toLowerCase()));
    expect(matched).toHaveLength(0);
  });

  it('ignores self-mentions', () => {
    const currentUserId = '1';
    const keys = commentsService.parseMentions('Hello @alice');
    const matched = members.find(
      (m) => m.mentionKey?.toLowerCase() === keys[0]?.toLowerCase() && m.id !== currentUserId,
    );
    expect(matched).toBeUndefined();
  });

  it('matches non-self mentions', () => {
    const currentUserId = '1';
    const keys = commentsService.parseMentions('Hello @bob');
    const matched = members.find(
      (m) => m.mentionKey?.toLowerCase() === keys[0]?.toLowerCase() && m.id !== currentUserId,
    );
    expect(matched).toBeDefined();
    expect(matched!.id).toBe('2');
  });

  it('handles multiple mentions with some being self', () => {
    const currentUserId = '1';
    const keys = commentsService.parseMentions('@alice @bob @charlie');
    const matched = members.filter(
      (m) => keys.some((k) => m.mentionKey?.toLowerCase() === k.toLowerCase()) && m.id !== currentUserId,
    );
    expect(matched).toHaveLength(2);
    expect(matched.map((m) => m.id)).toEqual(['2', '3']);
  });

  it('matches mentionKey with mixed case in text', () => {
    const keys = commentsService.parseMentions('Hello @Alice');
    const matched = members.find(
      (m) => m.mentionKey?.toLowerCase() === keys[0]?.toLowerCase(),
    );
    expect(matched).toBeDefined();
    expect(matched!.id).toBe('1');
  });

  it('handles no matching mentionKeys', () => {
    const keys = commentsService.parseMentions('Hello @unknownperson');
    const matched = members.filter((m) => keys.some((k) => m.mentionKey?.toLowerCase() === k.toLowerCase()));
    expect(matched).toHaveLength(0);
  });
});
