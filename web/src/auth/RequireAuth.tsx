import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

/** 비로그인 시 로그인으로 보내고, 로그인 후 원래 화면으로 돌아온다(프로토타입의 authReturn). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loggedIn } = useAuth();
  const location = useLocation();
  if (!loggedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
