import { useRef, useEffect } from 'react';
import type { ViewportTransform } from '../../core/model/types';

export const useCanvasTouch = (
  containerRef: { current: HTMLDivElement | null },
  viewport: ViewportTransform,
  onViewportChange: (vp: ViewportTransform) => void,
) => {
  const touchStateRef = useRef<{
    isPanning: boolean;
    isPinching: boolean;
    startX: number;
    startY: number;
    initialDistance: number;
    initialScale: number;
    pinchCenterX: number;
    pinchCenterY: number;
  }>({
    isPanning: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    initialDistance: 0,
    initialScale: 1,
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const isCanvasBg = target === el ||
        Boolean(target?.classList?.contains('canvas-background')) ||
        target?.tagName?.toLowerCase() === 'svg' ||
        target?.id === 'canvas-svg-layer';

      if (e.touches.length === 1 && isCanvasBg) {
        touchStateRef.current.isPanning = true;
        touchStateRef.current.isPinching = false;
        touchStateRef.current.startX = e.touches[0].clientX - viewport.x;
        touchStateRef.current.startY = e.touches[0].clientY - viewport.y;
      } else if (e.touches.length === 2 && isCanvasBg) {
        touchStateRef.current.isPanning = false;
        touchStateRef.current.isPinching = true;
        touchStateRef.current.initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        ) || 1;
        touchStateRef.current.initialScale = viewport.scale;
        const rect = el.getBoundingClientRect();
        touchStateRef.current.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        touchStateRef.current.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStateRef.current.isPinching && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / touchStateRef.current.initialDistance;
        const newScale = Math.min(Math.max(touchStateRef.current.initialScale * factor, 0.05), 3.0);
        const midX = touchStateRef.current.pinchCenterX;
        const midY = touchStateRef.current.pinchCenterY;
        const newX = midX - (midX - viewport.x) * (newScale / viewport.scale);
        const newY = midY - (midY - viewport.y) * (newScale / viewport.scale);
        onViewportChange({ x: newX, y: newY, scale: newScale });
      } else if (touchStateRef.current.isPanning && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        onViewportChange({
          x: e.touches[0].clientX - touchStateRef.current.startX,
          y: e.touches[0].clientY - touchStateRef.current.startY,
          scale: viewport.scale,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) touchStateRef.current.isPinching = false;
      if (e.touches.length === 0) touchStateRef.current.isPanning = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [viewport, onViewportChange]);
};
