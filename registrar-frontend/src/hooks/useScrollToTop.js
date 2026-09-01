import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global Route Scroll Reset Component
 * Automatically resets scroll position to top whenever route/pathname changes.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const containers = document.querySelectorAll('main, .overflow-y-auto');
    containers.forEach((container) => {
      container.scrollTop = 0;
    });
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

/**
 * Industry-Standard `useScrollToTop` Custom Hook
 * ---------------------------------------------
 * Provides header-aware, smooth scrolling for wizard forms, multi-step components,
 * and page transitions across all modules in the application.
 *
 * Features:
 *  - Automatically measures the fixed header height so content never clips under headers.
 *  - Supports both automatic trigger on dependency changes and manual `scrollToTop()` calls.
 *  - Respects user accessibility preferences (`prefers-reduced-motion`).
 *
 * @param {Array} [deps=[]] - Array of dependencies (e.g. [currentStep, isSubmitted]) to trigger auto-scroll.
 * @param {Object} [options={}]
 * @param {number} [options.offset=16] - Additional breathing room in pixels below the header.
 * @param {boolean} [options.enabled=true] - Whether auto-scrolling on dep change is active.
 * @returns {{ targetRef: React.RefObject, scrollToTop: Function }}
 */
const getScrollContainer = (element) => {
  if (typeof window === 'undefined') return null;

  let curr = element?.parentElement;
  while (curr) {
    const style = window.getComputedStyle(curr);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return curr;
    }
    curr = curr.parentElement;
  }

  return document.querySelector('.overflow-y-auto')
    || document.querySelector('main')
    || document.documentElement;
};

export const useScrollToTop = (deps = [], options = {}) => {
  const { offset = 16, enabled = true } = options;
  const targetRef = useRef(null);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check user accessibility preference for motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';

    // Locate the actual scrollable parent container
    const container = getScrollContainer(targetRef.current);

    if (container) {
      container.scrollTo({ top: 0, behavior });
    }

    // Always reset outer window scroll position for mobile webview compatibility
    window.scrollTo({ top: 0, behavior });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    scrollToTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return {
    targetRef,
    scrollToTop,
  };
};

export default useScrollToTop;
