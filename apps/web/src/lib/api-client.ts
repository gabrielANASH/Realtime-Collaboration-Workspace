const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type RefreshState = {
  promise: Promise<string> | null;
};

const refreshState: RefreshState = { promise: null };

async function doRefresh(): Promise<string> {
  const { useAuthStore } = await import('@/stores/auth-store');
  const { refreshTokenRequest } = await import('@/features/auth/auth-api');

  const store = useAuthStore.getState();
  const token = store.refreshToken;

  if (!token) {
    store.clear();
    throw new Error('No refresh token available');
  }

  const session = await refreshTokenRequest(token);
  store.setSession(session);
  return session.accessToken;
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshState.promise) {
    refreshState.promise = doRefresh().finally(() => {
      refreshState.promise = null;
    });
  }
  return refreshState.promise;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { useAuthStore } = await import('@/stores/auth-store');

  const token = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && token) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch {
      useAuthStore.getState().clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
      throw new ApiError('Session expired', 401);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || response.statusText, response.status);
  }

  return response.json();
}
