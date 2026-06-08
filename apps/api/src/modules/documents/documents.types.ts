import type { Document, User } from '@prisma/client';

export type DocumentWithAuthor = Document & {
  author: Pick<User, 'id' | 'email' | 'name'>;
};

export type DocumentSummary = Pick<Document, 'id' | 'title' | 'createdAt' | 'updatedAt'> & {
  authorId: string;
  authorName: string | null;
};

export type DocumentDetail = DocumentWithAuthor;
