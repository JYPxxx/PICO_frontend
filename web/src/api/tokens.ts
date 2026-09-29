// 토큰 저장소. 앱(Capacitor) 확장 시 이 파일만 Preferences/SecureStorage로 교체한다.
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  userId?: number;
}

const KEY = 'pico.auth';
type Listener = (tokens: StoredTokens | null) => void;
const listeners = new Set<Listener>();

export function getTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: StoredTokens | null) {
  try {
    if (tokens) localStorage.setItem(KEY, JSON.stringify(tokens));
    else localStorage.removeItem(KEY);
  } catch {
    // 저장 불가(사생활 보호 모드 등) 시 현재 탭에서만 유지된다.
  }
  listeners.forEach((fn) => fn(tokens));
}

export function onTokensChange(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
