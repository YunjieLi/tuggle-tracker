import { useEffect, useState } from 'react';

const SCROLL_THRESHOLD = 8;
const TOP_TAP_ZONE = 32;
const TAP_DISTANCE = 20;
const DOUBLE_TAP_INTERVAL = 350;

export function useScrollNavigation(headerRef, page, menuOpen) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let previousY = Math.max(0, window.scrollY);
    let touchStart;
    let previousTap;
    setHidden(false);

    function handleScroll() {
      const header = headerRef.current;
      if (!header) return;
      const root = document.scrollingElement;
      const maxY = Math.max(0, root.scrollHeight - root.clientHeight);
      const y = Math.min(maxY, Math.max(0, window.scrollY));
      if (menuOpen || y <= header.offsetHeight) {
        previousY = y;
        setHidden(false);
      } else if (Math.abs(y - previousY) >= SCROLL_THRESHOLD) {
        setHidden(y > previousY);
        previousY = y;
      }
    }

    function canTap(target, y) {
      return headerRef.current && y <= TOP_TAP_ZONE && !menuOpen
        && !document.querySelector('[role="dialog"][data-state="open"]')
        && !target.closest('button, a, input, textarea, select, label, [role="button"], [contenteditable]');
    }

    function scrollToTop() {
      setHidden(false);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
    }

    function handleTouchStart(event) {
      const touch = event.touches[0];
      touchStart = event.touches.length === 1 && canTap(event.target, touch.clientY) ? touch : undefined;
      if (!touchStart) previousTap = undefined;
    }

    function handleTouchEnd(event) {
      const touch = event.changedTouches[0];
      const start = touchStart;
      touchStart = undefined;
      if (!start || touch.identifier !== start.identifier || !canTap(event.target, touch.clientY)
        || Math.hypot(touch.clientX - start.clientX, touch.clientY - start.clientY) > TAP_DISTANCE) {
        previousTap = undefined;
        return;
      }
      const at = performance.now();
      if (previousTap && at - previousTap.at <= DOUBLE_TAP_INTERVAL
        && Math.abs(touch.clientX - previousTap.x) <= TAP_DISTANCE) {
        previousTap = undefined;
        if (event.cancelable) event.preventDefault();
        scrollToTop();
      } else {
        previousTap = { at, x: touch.clientX };
      }
    }

    function cancelTap() {
      touchStart = undefined;
      previousTap = undefined;
    }

    function handleDoubleClick(event) {
      if (canTap(event.target, event.clientY)) scrollToTop();
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', cancelTap);
    document.addEventListener('dblclick', handleDoubleClick);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', cancelTap);
      document.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [headerRef, page, menuOpen]);

  return hidden;
}
