import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import { logger } from '../../lib/logger';
import type { DocumentEdit } from '@workspace/shared';
import type { Prisma } from '@prisma/client';
import { applyOperation, applyOperations } from './operational-transform';

/**
 * Service for handling collaborative document editing
 * Manages version control, conflict detection, and edit transformation
 */

export class DocumentCollaborationService {
  /**
   * Apply collaborative edits to a document
   * Validates version, transforms operations if needed, and persists
   */
  async applyCollaborativeEdits(
    userId: string,
    documentId: string,
    edits: DocumentEdit[],
    baseVersion: number,
    currentVersion: number,
  ): Promise<{
    version: number;
    content: string;
    savedEdits: number;
  }> {
    // Fetch current document state
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, authorId: true, content: true, version: true },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // Verify user is member of workspace
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: document.workspaceId,
        },
      },
    });

    if (!membership) {
      throw new HttpError(403, 'Not a member of this workspace', 'NOT_WORKSPACE_MEMBER');
    }

    // Check for version conflict before attempting update
    if (baseVersion !== document.version) {
      logger.warn('Version conflict detected', {
        documentId,
        userId,
        clientBaseVersion: baseVersion,
        serverVersion: document.version,
      });

      throw new HttpError(
        409,
        'Document was modified by another user',
        'VERSION_CONFLICT',
        {
          serverVersion: document.version,
          serverContent: document.content,
          conflictingEdits: edits,
        },
      );
    }

    try {
      // Apply all edits sequentially
      let content = document.content;
      const appliedEdits: DocumentEdit[] = [];

      for (const edit of edits) {
        if (this.validateEdit(edit, content.length)) {
          content = applyOperation(content, edit);
          appliedEdits.push(edit);
        } else {
          logger.warn('Skipping invalid edit', {
            documentId,
            edit,
            contentLength: content.length,
          });
        }
      }

      if (appliedEdits.length === 0) {
        throw new HttpError(400, 'No valid edits to apply', 'NO_VALID_EDITS');
      }

      // Optimistic locking: only update if version hasn't changed
      const newVersion = document.version + appliedEdits.length;
      const updateResult = await prisma.document.updateMany({
        where: { id: documentId, version: document.version },
        data: {
          content,
          version: newVersion,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Another write won the race — version mismatch detected
        const current = await prisma.document.findUnique({
          where: { id: documentId },
          select: { version: true, content: true },
        });

        logger.warn('Optimistic lock failure', {
          documentId,
          userId,
          expectedVersion: document.version,
          actualVersion: current?.version,
        });

        throw new HttpError(
          409,
          'Document was modified by another user',
          'VERSION_CONFLICT',
          {
            serverVersion: current?.version ?? document.version,
            serverContent: current?.content ?? document.content,
            conflictingEdits: edits,
          },
        );
      }

      // Persist edit history
      const documentEditRecords = appliedEdits.map((edit, index) => ({
        documentId,
        userId,
        operation: edit as unknown as Prisma.InputJsonValue,
        version: document.version + index + 1,
      }));

      await prisma.documentEdit.createMany({
        data: documentEditRecords,
      });

      logger.info('Document edits applied', {
        documentId,
        userId,
        editsApplied: appliedEdits.length,
        newVersion,
      });

      return {
        version: newVersion,
        content,
        savedEdits: appliedEdits.length,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      logger.error('Error applying collaborative edits', {
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpError(500, 'Failed to apply edits', 'EDIT_APPLICATION_FAILED');
    }
  }

  /**
   * Handle concurrent edits with transformation
   * Uses operational transform to merge conflicting changes
   */
  async handleConcurrentEdits(
    userId: string,
    documentId: string,
    clientEdits: DocumentEdit[],
    clientBaseVersion: number,
  ): Promise<{
    version: number;
    content: string;
    transformedEdits: DocumentEdit[];
  }> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, content: true, version: true },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // If client is behind, they need to sync first
    if (clientBaseVersion < document.version) {
      const versionGap = document.version - clientBaseVersion;

      // Get operations that happened between client's base version and now
      // In a production system, you'd store edit history
      logger.info('Client behind server, version sync needed', {
        documentId,
        clientBaseVersion,
        serverVersion: document.version,
        versionGap,
      });

      // Transform client's edits against server's newer edits
      // For now, we'll just reject and ask client to resync
      throw new HttpError(409, 'Document was modified, please refresh', 'VERSION_CONFLICT', {
        serverVersion: document.version,
        serverContent: document.content,
      });
    }

    // Apply client edits if versions match
    return this.applyCollaborativeEdits(
      userId,
      documentId,
      clientEdits,
      clientBaseVersion,
      clientBaseVersion + clientEdits.length,
    ).then((result) => ({
      ...result,
      transformedEdits: clientEdits,
    }));
  }

  /**
   * Get document sync snapshot
   * Used by clients to resync after conflicts or reconnection
   */
  async getSyncSnapshot(userId: string, documentId: string): Promise<{
    id: string;
    content: string;
    version: number;
    lastModified: Date;
  }> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        workspaceId: true,
        content: true,
        version: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: document.workspaceId,
        },
      },
    });

    if (!membership) {
      throw new HttpError(403, 'Not authorized to access this document', 'FORBIDDEN');
    }

    return {
      id: document.id,
      content: document.content,
      version: document.version,
      lastModified: document.updatedAt,
    };
  }

  /**
   * Validate edit operation
   * Ensures edit is well-formed and positions are valid
   */
  validateEdit(edit: DocumentEdit, contentLength: number): boolean {
    switch (edit.type) {
      case 'insert':
        // Position must be within bounds
        return edit.position >= 0 && edit.position <= contentLength && edit.content.length > 0;

      case 'delete':
        // Position and length must be valid
        return (
          edit.position >= 0 &&
          (edit.length || 0) > 0 &&
          edit.position + (edit.length || 0) <= contentLength
        );

      case 'replace':
        // Both position and length must be valid
        return (
          edit.position >= 0 &&
          (edit.length || 0) > 0 &&
          edit.position + (edit.length || 0) <= contentLength &&
          edit.content.length > 0
        );

      default:
        return false;
    }
  }

  /**
   * Calculate document statistics
   * Used for analytics and monitoring
   */
  async getDocumentStats(documentId: string): Promise<{
    totalEdits: number;
    currentVersion: number;
    contentLength: number;
    lastModified: Date;
  }> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        version: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    return {
      totalEdits: document.version,
      currentVersion: document.version,
      contentLength: document.content.length,
      lastModified: document.updatedAt,
    };
  }
}
