import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email();

export const passwordSchema = z.string().min(8).max(100);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: emailSchema.optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
