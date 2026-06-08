import { Router } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  registerSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from '@workspace/shared';
import { validateBody } from '../../middleware/validate-request';
import { requireAccessToken } from './auth.middleware';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export const authRouter = Router();

const authController = new AuthController(new AuthService());

authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/logout', validateBody(logoutSchema), authController.logout);
authRouter.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
authRouter.get('/me', requireAccessToken, authController.me);
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

authRouter.post('/sign-in', validateBody(loginSchema), authController.login);
