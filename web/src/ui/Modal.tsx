import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

// 프로토타입 openModal()의 <dialog class="modal"> 마크업을 그대로 쓴다.
export function Modal({
  title,
  onClose,
  wide = false,
  className = '',
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''} ${className}`}
      aria-labelledby="modal-heading"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
      }}
    >
      <header className="modal-header">
        <h2 id="modal-heading">{title}</h2>
        <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>,
    document.body,
  );
}
