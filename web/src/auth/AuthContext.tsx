import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, unwrap } from '../api/client';
import { getTokens, onTokensChange, setTokens } from '../api/tokens';

// GET /api/me 응답 스키마가 명세에 없어(data: object) 필드가 확정될 때까지 느슨하게 둔다.
export type Me = Record<string, unknown>;

interface AuthValue {
  me: Me | null;
  loggedIn: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadMe: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(() => !!getTokens());
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(loggedIn);

  const reloadMe = useCallback(async () => {
    if (!getTokens()) return setMe(null);
    setLoading(true);
    try {
      setMe(await unwrap<Me>(api.GET('/api/me')));
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => onTokensChange((t) => setLoggedIn(!!t)), []);
  useEffect(() => {
    if (loggedIn) void reloadMe();
  }, [loggedIn, reloadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const t = await unwrap(api.POST('/api/auth/login', { body: { email, password } }));
    setTokens({ accessToken: t.accessToken!, refreshToken: t.refreshToken!, userId: t.userId });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.POST('/api/auth/logout');
    } finally {
      setTokens(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ me: loggedIn ? me : null, loggedIn, loading, login, logout, reloadMe }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth는 AuthProvider 안에서 사용해야 해요.');
  return value;
}
