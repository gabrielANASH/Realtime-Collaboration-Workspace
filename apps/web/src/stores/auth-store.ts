import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

type User = {
  id: string;
  email: string;
  name: string;
};

export type AuthSessionData = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (session: AuthSessionData) => void;
  setAccessToken: (accessToken: string | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (session) => {
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        });
      },
      setAccessToken: (accessToken) => {
        if (!accessToken) {
          set({ accessToken: null, refreshToken: null, user: null });
          return;
        }
        try {
          const decoded = jwtDecode<{ sub: string; email: string; name: string }>(accessToken);
          set({
            accessToken,
            user: {
              id: decoded.sub,
              email: decoded.email,
              name: decoded.name,
            },
          });
        } catch {
          set({ accessToken: null, refreshToken: null, user: null });
        }
      },
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth-storage' },
  ),
);
