import type { NextFunction, Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { CreateDocumentInput, UpdateDocumentInput } from '@workspace/shared';

export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  createDocument = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const document = await this.documentsService.createDocument(
        authenticatedUser.id,
        workspaceId,
        request.body as CreateDocumentInput,
      );

      await this.activityLogsService.createActivityLog(
        workspaceId,
        authenticatedUser.id,
        'document_created',
        'document',
        document.id,
        { title: document.title },
      );

      response.status(201).json({ document });
    } catch (error) {
      next(error);
    }
  };

  getDocument = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const documentId = request.params.documentId as string;
      const document = await this.documentsService.getDocument(authenticatedUser.id, documentId);

      response.status(200).json({ document });
    } catch (error) {
      next(error);
    }
  };

  updateDocument = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const documentId = request.params.documentId as string;
      const document = await this.documentsService.updateDocument(
        authenticatedUser.id,
        documentId,
        request.body as UpdateDocumentInput,
      );

      await this.activityLogsService.createActivityLog(
        document.workspaceId,
        authenticatedUser.id,
        'document_updated',
        'document',
        documentId,
        { title: document.title },
      );

      response.status(200).json({ document });
    } catch (error) {
      next(error);
    }
  };

  deleteDocument = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const documentId = request.params.documentId as string;
      await this.documentsService.deleteDocument(authenticatedUser.id, documentId);

      response.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  listDocumentsInWorkspace = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const workspaceId = request.params.workspaceId as string;
      const documents = await this.documentsService.listDocumentsInWorkspace(authenticatedUser.id, workspaceId);

      response.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  };
}
