import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate-request';
import { requireAccessToken } from '../auth/auth.middleware';
import { documentCollaborationSchema, documentIdParamSchema } from '@workspace/shared';
import { DocumentCollaborationService } from './document-collaboration.service';
import { DocumentsService } from './documents.service';
import { logger } from '../../lib/logger';
import { getIO } from '../../lib/socket';
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../errors/http-error';

const collaborationService = new DocumentCollaborationService();
const documentsService = new DocumentsService();

/**
 * POST /workspaces/:workspaceId/documents/:documentId/collaborate
 * Apply collaborative edits with conflict detection
 */
export async function applyCollaborativeEdits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).authenticatedUser?.id;
    if (!userId) {
      next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
      return;
    }

    const { documentId, workspaceId } = req.params as {
      documentId: string;
      workspaceId: string;
    };
    const { edits, baseVersion, currentVersion } = req.body as {
      edits: any[];
      baseVersion: number;
      currentVersion: number;
    };

    logger.debug('Applying collaborative edits', {
      documentId,
      userId,
      editsCount: edits.length,
      baseVersion,
      currentVersion,
    });

    const result = await collaborationService.applyCollaborativeEdits(
      userId,
      documentId,
      edits,
      baseVersion,
      currentVersion,
    );

    try {
      getIO().of('/workspace').to(`workspace:${workspaceId}`).emit('document:saved', {
        documentId,
        version: result.version,
        editsApplied: result.savedEdits,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.warn('Failed to emit document:saved socket event', {
        documentId,
        workspaceId,
        error: socketError instanceof Error ? socketError.message : 'Unknown error',
      });
    }

    res.json({
      success: true,
      version: result.version,
      content: result.content,
      savedEdits: result.savedEdits,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /workspaces/:workspaceId/documents/:documentId/sync
 * Get document sync snapshot for conflict resolution
 */
export async function getSyncSnapshot(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).authenticatedUser?.id;
    if (!userId) {
      next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
      return;
    }

    const { documentId } = req.params as { documentId: string };

    const snapshot = await collaborationService.getSyncSnapshot(userId, documentId);

    res.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Setup collaborative editing routes
 */
export function setupCollaborationRoutes(router: Router): void {
  router.post(
    '/:documentId/collaborate',
    requireAccessToken,
    validateParams(documentIdParamSchema),
    validateBody(documentCollaborationSchema),
    applyCollaborativeEdits,
  );

  router.get(
    '/:documentId/sync',
    requireAccessToken,
    validateParams(documentIdParamSchema),
    getSyncSnapshot,
  );
}
