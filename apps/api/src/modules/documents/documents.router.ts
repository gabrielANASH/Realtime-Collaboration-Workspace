import { Router } from 'express';
import { createDocumentSchema, documentIdParamSchema, updateDocumentSchema, documentCollaborationSchema } from '@workspace/shared';
import { validateBody, validateParams } from '../../middleware/validate-request';
import { requireAccessToken } from '../auth/auth.middleware';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { setupCollaborationRoutes } from './document-collaboration.controller';
import { setupCommentsRoutes } from '../comments/comments.router';

export const documentsRouter = Router({ mergeParams: true });

const documentsController = new DocumentsController(new DocumentsService(), new ActivityLogsService());

documentsRouter.get('/', requireAccessToken, documentsController.listDocumentsInWorkspace);
documentsRouter.post('/', requireAccessToken, validateBody(createDocumentSchema), documentsController.createDocument);
documentsRouter.get('/:documentId', requireAccessToken, validateParams(documentIdParamSchema), documentsController.getDocument);
documentsRouter.patch(
  '/:documentId',
  requireAccessToken,
  validateParams(documentIdParamSchema),
  validateBody(updateDocumentSchema),
  documentsController.updateDocument,
);
documentsRouter.delete('/:documentId', requireAccessToken, validateParams(documentIdParamSchema), documentsController.deleteDocument);

// Setup collaborative editing routes
setupCollaborationRoutes(documentsRouter);

// Document comments (with mention notifications)
const commentsSubRouter = Router({ mergeParams: true });
setupCommentsRoutes(commentsSubRouter);
documentsRouter.use('/:documentId/comments', commentsSubRouter);
