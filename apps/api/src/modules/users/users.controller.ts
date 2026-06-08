import type { NextFunction, Request, Response } from 'express';
import { UsersService } from './users.service';
import type { UpdateProfileInput, ChangePasswordInput } from '@workspace/shared';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  updateProfile = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const user = await this.usersService.updateProfile(
        authenticatedUser.id,
        request.body as UpdateProfileInput,
      );

      response.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedUser = request.authenticatedUser;

      if (!authenticatedUser) {
        response.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const result = await this.usersService.changePassword(
        authenticatedUser.id,
        request.body as ChangePasswordInput,
      );

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
