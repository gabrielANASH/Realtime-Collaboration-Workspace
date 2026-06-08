import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import type { CreateCommentInput } from '@workspace/shared';

export type CommentRecord = {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
  replies?: CommentRecord[];
};

export class CommentsService {
  async createComment(
    userId: string,
    documentId: string,
    input: CreateCommentInput,
  ): Promise<CommentRecord> {
    if (input.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { documentId: true },
      });
      if (!parent || parent.documentId !== documentId) {
        throw new HttpError(400, 'Invalid parent comment', 'INVALID_PARENT');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        documentId,
        userId,
        content: input.content,
        parentId: input.parentId ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: comment.id,
      documentId: comment.documentId,
      userId: comment.userId,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.user,
    };
  }

  async listComments(documentId: string): Promise<CommentRecord[]> {
    const comments = await prisma.comment.findMany({
      where: { documentId, parentId: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      userId: c.userId,
      content: c.content,
      parentId: c.parentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      author: c.user,
      replies: c.replies.map((r) => ({
        id: r.id,
        documentId: r.documentId,
        userId: r.userId,
        content: r.content,
        parentId: r.parentId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        author: r.user,
      })),
    }));
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) {
      throw new HttpError(404, 'Comment not found', 'COMMENT_NOT_FOUND');
    }

    if (comment.userId !== userId) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    await prisma.comment.delete({ where: { id: commentId } });
  }

  async getWorkspaceMembers(documentId: string): Promise<Array<{ id: string; name: string | null; email: string; mentionKey: string | null }>> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const memberships = await prisma.membership.findMany({
      where: { workspaceId: document.workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, mentionKey: true } },
      },
    });

    return memberships.map((m) => m.user);
  }

  parseMentions(content: string): string[] {
    const matches = content.match(/@(\w+)/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(1)))];
  }
}
