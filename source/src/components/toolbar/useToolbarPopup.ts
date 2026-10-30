import { RefObject, useLayoutEffect, useRef } from 'react';

export function useToolbarPopup(ref: RefObject<HTMLElement | null>, active: string | null, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => {
    const header = ref.current;
    if (!header || !active) return;
    const menu = header.querySelector<HTMLElement>(`[data-mindflow-popup="${active}"]`);
    const trigger = header.querySelector<HTMLElement>(`[data-mindflow-popup-trigger="${active}"]`) || header.querySelector<HTMLElement>('[data-mindflow-popup-trigger="more"]');
    if (!menu || !trigger) return;
    const win = header.ownerDocument.defaultView!;
    const items = () => [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', trigger.getAttribute('title') || '工具栏菜单');
    for (const item of items()) { item.setAttribute('role', 'menuitem'); item.tabIndex = -1; }
    const position = () => {
      menu.style.position = 'fixed';
      menu.style.marginTop = '0';
      menu.style.maxWidth = 'calc(100vw - 24px)';
      menu.style.maxHeight = 'calc(100vh - 24px)';
      menu.style.overflowY = 'auto';
      const anchor = trigger.getBoundingClientRect();
      menu.style.left = `${Math.max(12, Math.min(anchor.left, win.innerWidth - menu.offsetWidth - 12))}px`;
      menu.style.top = `${Math.max(12, Math.min(anchor.bottom + menu.offsetHeight + 4 <= win.innerHeight ? anchor.bottom + 4 : anchor.top - menu.offsetHeight - 4, win.innerHeight - menu.offsetHeight - 12))}px`;
    };
    position();
    items()[0]?.focus({ preventScroll: true });
    const dismiss = () => { trigger.focus({ preventScroll: true }); closeRef.current(); };
    const key = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.key === 'Escape' || event.key === 'Tab') {
        dismiss(); event.stopPropagation();
        if (event.key === 'Escape') event.preventDefault();
      } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        const options = items();
        if (!options.length) return;
        const current = options.indexOf(header.ownerDocument.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options[next].focus(); event.preventDefault(); event.stopPropagation();
      }
    };
    const outside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!menu.contains(target) && !target.closest?.('[data-mindflow-popup-trigger]')) closeRef.current();
    };
    menu.addEventListener('keydown', key);
    win.addEventListener('mousedown', outside);
    win.addEventListener('resize', position);
    return () => {
      menu.removeEventListener('keydown', key);
      win.removeEventListener('mousedown', outside);
      win.removeEventListener('resize', position);
      if (menu.contains(header.ownerDocument.activeElement) || header.ownerDocument.activeElement === header.ownerDocument.body) trigger.focus({ preventScroll: true });
    };
  }, [ref, active]);
}
