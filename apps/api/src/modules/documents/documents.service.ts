import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import type { CreateDocumentInput, UpdateDocumentInput } from '@workspace/shared';
import type { DocumentDetail, DocumentSummary } from './documents.types';

export class DocumentsService {
  async createDocument(
    userId: string,
    workspaceId: string,
    input: CreateDocumentInput,
  ): Promise<DocumentDetail> {
    await this.assertUserInWorkspace(userId, workspaceId);

    const document = await prisma.document.create({
      data: {
        title: input.title.trim(),
        content: input.content || '',
        workspaceId,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return document;
  }

  async getDocument(userId: string, documentId: string): Promise<DocumentDetail> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    await this.assertUserInWorkspace(userId, document.workspaceId);

    return document;
  }

  async updateDocument(
    userId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentDetail> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, authorId: true },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    await this.assertUserInWorkspace(userId, document.workspaceId);

    if (document.authorId !== userId) {
      throw new HttpError(403, 'Only the document author can edit this document', 'FORBIDDEN');
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
      },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return updated;
  }

  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, authorId: true },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    await this.assertUserInWorkspace(userId, document.workspaceId);

    if (document.authorId !== userId) {
      throw new HttpError(403, 'Only the document author can delete this document', 'FORBIDDEN');
    }

    await prisma.document.delete({
      where: { id: documentId },
    });
  }

  async listDocumentsInWorkspace(userId: string, workspaceId: string): Promise<DocumentSummary[]> {
    await this.assertUserInWorkspace(userId, workspaceId);

    const documents = await prisma.document.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      authorId: doc.authorId,
      authorName: doc.author.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  private async assertUserInWorkspace(userId: string, workspaceId: string): Promise<void> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new HttpError(403, 'Not a member of this workspace', 'NOT_WORKSPACE_MEMBER');
    }
  }
}
