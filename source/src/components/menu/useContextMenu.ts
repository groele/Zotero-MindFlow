import { RefObject, useLayoutEffect, useRef } from 'react';

/** Keyboard and viewport behavior shared by the two editor context menus. */
export function useContextMenu(ref: RefObject<HTMLDivElement | null>, onClose: () => void, x: number, y: number) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const doc = menu.ownerDocument;
    const win = doc.defaultView!;
    const previous = doc.activeElement as HTMLElement | null;
    const items = () => Array.from(menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    for (const button of menu.querySelectorAll('button')) {
      button.setAttribute('role', 'menuitem');
      button.tabIndex = -1;
    }
    const position = () => {
      menu.style.left = `${Math.max(12, Math.min(x, win.innerWidth - menu.offsetWidth - 12))}px`;
      menu.style.top = `${Math.max(12, Math.min(y, win.innerHeight - menu.offsetHeight - 12))}px`;
    };
    position();
    items()[0]?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.key === 'Escape' || event.key === 'Tab') {
        // Match popup dismissal: return to its invoker before tabbing onward.
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        closeRef.current();
        if (event.key === 'Escape') event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const choices = items();
      if (!choices.length) return;
      const current = choices.indexOf(doc.activeElement as HTMLButtonElement);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      event.preventDefault();
      event.stopPropagation();
      choices[index].focus();
    };
    const outside = (event: MouseEvent) => {
      if (event.button !== 2 && !menu.contains(event.target as Node)) closeRef.current();
    };
    menu.addEventListener('keydown', onKey);
    win.addEventListener('mousedown', outside);
    win.addEventListener('resize', position);
    return () => {
      menu.removeEventListener('keydown', onKey);
      win.removeEventListener('mousedown', outside);
      win.removeEventListener('resize', position);
      if ((menu.contains(doc.activeElement) || doc.activeElement === doc.body) && previous?.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [ref, x, y]);
  return { left: x, top: y, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' as const };
}
