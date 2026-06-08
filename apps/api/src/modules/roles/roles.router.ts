import { Router } from 'express';
import type { Request, Response } from 'express';

export const rolesRouter = Router();

rolesRouter.get('/', (_request: Request, response: Response) => {
  response.json({ items: ['owner', 'admin', 'member', 'viewer'] });
});