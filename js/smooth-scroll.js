/* Cuộn quán tính theo cùng nguyên tắc của trang tham chiếu Feed Forge. */
(function () {
  'use strict';

  if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches || innerWidth < 769) return;

  const lenis = new window.Lenis({
    duration: 1.6,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
    autoResize: true
  });

  /* Router nội bộ thay toàn bộ chiều cao tài liệu trong cùng một document. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let rafId = 0;
  const raf = time => {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  };

  const start = () => {
    if (!rafId) rafId = requestAnimationFrame(raf);
  };
  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener('pagehide', () => {
    stop();
    lenis.destroy();
  }, { once: true });

  window.vivuLenis = lenis;
  start();
})();
