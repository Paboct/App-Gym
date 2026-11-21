import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startsInSwipeBlocker, swipeTarget } from './swipe';

/** Deslizar a izquierda/derecha cambia de pestaña, además de los botones de la barra inferior. */
export function useTabSwipe(): void {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = e.touches.length === 1 && !startsInSwipeBlocker(e.target as Element) ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const to = swipeTarget(pathname, t.clientX - start.x, t.clientY - start.y, Date.now() - start.t);
      start = null;
      if (to) navigate(to);
    };
    const onCancel = () => {
      start = null;
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, [pathname, navigate]);
}
