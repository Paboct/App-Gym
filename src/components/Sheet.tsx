import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
}

/** Hoja modal: sube desde abajo en móvil y se centra en escritorio. */
export function Sheet({ title, onClose, children, full }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2 className="grow truncate">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
