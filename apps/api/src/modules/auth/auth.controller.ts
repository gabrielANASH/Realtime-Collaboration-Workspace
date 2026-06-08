import type { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from '@workspace/shared';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(request.body as RegisterInput);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(request.body as LoginInput);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.logout(request.body as LogoutInput);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.refresh(request.body as RefreshTokenInput);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.forgotPassword(request.body as ForgotPasswordInput);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.resetPassword(request.body as ResetPasswordInput);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  me = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const user = await this.authService.getCurrentUser(authenticatedUser.id);
      response.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };
}
