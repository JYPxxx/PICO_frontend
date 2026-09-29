import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { emptyFilters, type Filters, type Sort } from './discovery/filters';

// 화면 사이를 오가도 유지되는 UI 상태(프로토타입 state의 일부). 서버 데이터(좋아요 등)는 여기에 두지 않는다.
export type Mode = 'user' | 'agent';
interface UiState {
  mode: Mode;
  query: string;
  sort: Sort;
  filters: Filters;
}
const STORAGE_KEY = 'pico-web-ui-v1';
const initial: UiState = { mode: 'user', query: '', sort: 'recommend', filters: emptyFilters() };

function load(): UiState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return stored ? { ...initial, ...stored, filters: { ...emptyFilters(), ...stored.filters } } : initial;
  } catch {
    return initial;
  }
}

const AppStateContext = createContext<[UiState, Dispatch<SetStateAction<UiState>>] | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const value = useState(load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value[0]));
    } catch {
      // 저장 공간이 없어도 현재 창에서는 유지된다.
    }
  }, [value]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState는 AppStateProvider 안에서 사용해야 해요.');
  return value;
}
