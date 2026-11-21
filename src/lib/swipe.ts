/** Pestañas principales, en el orden de la barra inferior. */
export const TAB_PATHS = ['/', '/history', '/train', '/kpis', '/profile'] as const;

/** Distancia mínima horizontal (px) y proporción frente a la vertical para contar como deslizamiento. */
export const SWIPE_MIN_DX = 70;
export const SWIPE_RATIO = 1.6;
export const SWIPE_MAX_MS = 700;

/**
 * Pestaña a la que lleva un deslizamiento, o null si no hay que moverse.
 * Deslizar a la izquierda va a la pestaña siguiente; a la derecha, a la anterior.
 * Solo actúa en las pestañas principales (no en el entreno, el asistente, etc.).
 */
export function swipeTarget(pathname: string, dx: number, dy: number, ms: number): string | null {
  const i = TAB_PATHS.indexOf(pathname as (typeof TAB_PATHS)[number]);
  if (i < 0) return null;
  if (ms > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_MIN_DX || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return null;
  const next = i + (dx < 0 ? 1 : -1);
  return next < 0 || next >= TAB_PATHS.length ? null : TAB_PATHS[next];
}

/** El gesto empieza en algo que ya usa el deslizamiento horizontal (campos, gráficas, listas con scroll) o en una hoja modal. */
export function startsInSwipeBlocker(el: Element | null): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const tag = n.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (n.classList.contains('sheet-backdrop') || n.hasAttribute('data-no-swipe')) return true;
    if (n instanceof HTMLElement && n.scrollWidth > n.clientWidth + 1) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}
