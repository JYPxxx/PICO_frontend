import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const ToastContext = createContext<(message: string) => void>(() => {});

// 프로토타입 toast()와 같은 마크업. index.html의 #toasts에 그린다.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<number>(undefined);
  const toast = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 5000);
  }, []);
  const root = document.getElementById('toasts');

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {root &&
        message &&
        createPortal(
          <div className="toast pc-toast">
            <span>
              <Icon name="bell" size={20} />
            </span>
            <div>
              <strong>알림</strong>
              <p>{message}</p>
            </div>
            <button type="button" aria-label="알림 닫기" onClick={() => setMessage('')}>
              <Icon name="close" size={16} />
            </button>
          </div>,
          root,
        )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
