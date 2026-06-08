import type { SignInInput, RegisterInput, UpdateProfileInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput } from '@workspace/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface AuthSession {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export async function signInRequest(input: SignInInput): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Login failed');
  }
  return response.json();
}

export async function registerRequest(input: RegisterInput): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Registration failed');
  }
  return response.json();
}

export async function refreshTokenRequest(refreshToken: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
  return response.json();
}

export async function getMeRequest(accessToken: string) {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json() as Promise<{ user: { id: string; email: string; name: string | null; createdAt?: string } }>;
}

export async function updateProfileRequest(input: UpdateProfileInput, accessToken: string) {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to update profile');
  }
  return response.json() as Promise<{ user: { id: string; email: string; name: string | null; createdAt?: string } }>;
}

export async function forgotPasswordRequest(input: ForgotPasswordInput): Promise<{ resetUrl?: string }> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Request failed');
  }
  return response.json();
}

export async function resetPasswordRequest(input: ResetPasswordInput): Promise<{ success: true }> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Password reset failed');
  }
  return response.json();
}

export async function changePasswordRequest(input: ChangePasswordInput, accessToken: string) {
  const response = await fetch(`${API_URL}/users/me/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to change password');
  }
  return response.json() as Promise<{ success: true }>;
}
