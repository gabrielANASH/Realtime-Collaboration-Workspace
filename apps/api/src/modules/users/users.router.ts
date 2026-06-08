import { Router } from 'express';
import { updateProfileSchema, changePasswordSchema } from '@workspace/shared';
import { validateBody } from '../../middleware/validate-request';
import { requireAccessToken } from '../auth/auth.middleware';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

export const usersRouter = Router();

const usersController = new UsersController(new UsersService());

usersRouter.patch('/me', requireAccessToken, validateBody(updateProfileSchema), usersController.updateProfile);
usersRouter.patch('/me/password', requireAccessToken, validateBody(changePasswordSchema), usersController.changePassword);
