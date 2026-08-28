/* Chỉ nạp engine của các cảnh nặng khi người dùng sắp cuộn tới. */
(function () {
  'use strict';

  const loaded = new Set();
  const loadScript = (src, module) => {
    if (loaded.has(src)) return Promise.resolve();
    loaded.add(src);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      if (module) script.type = 'module';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  let gsapReady;
  const loadGsap = () => gsapReady || (gsapReady = (window.gsap
    ? Promise.resolve()
    : loadScript('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js')
  ).then(() => loadScript(
    'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js'
  )));

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrained = Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType)));
  const preloadMargin = constrained ? '20% 0px' : '60% 0px';

  const observeOnce = (selector, callback) => {
    const target = document.querySelector(selector);
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      callback();
    }, { rootMargin: preloadMargin });
    observer.observe(target);
  };

  /* Tạm dừng CSS animation của mọi section ngoài màn hình. Đồng thời hạ ưu
     tiên ảnh và chỉ gắn tài nguyên SVG khi section sắp xuất hiện. */
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.decoding = 'async';
    img.fetchPriority = 'low';
  });

  const hydrate = root => {
    const assets = root.matches && root.matches('[data-src],[data-srcset],[data-poster],[data-lazy-href]')
      ? [root]
      : root.querySelectorAll('[data-src],[data-srcset],[data-poster],[data-lazy-href]');

    assets.forEach(asset => {
      if (asset.dataset.src) {
        asset.src = asset.dataset.src;
        asset.removeAttribute('data-src');
      }
      if (asset.dataset.srcset) {
        asset.srcset = asset.dataset.srcset;
        asset.removeAttribute('data-srcset');
      }
      if (asset.dataset.poster) {
        asset.poster = asset.dataset.poster;
        asset.removeAttribute('data-poster');
      }
      if (asset.dataset.lazyHref) {
        asset.setAttribute('href', asset.dataset.lazyHref);
        asset.removeAttribute('data-lazy-href');
      }
    });
  };

  const activationObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      hydrate(entry.target);
      entry.target.classList.add('is-lazy-ready');
      activationObserver.unobserve(entry.target);
    });
  }, { rootMargin: preloadMargin });

  const animationObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-section-active', entry.isIntersecting));
  }, { rootMargin: '10% 0px' });

  document.querySelectorAll('main > section').forEach(section => {
    activationObserver.observe(section);
    animationObserver.observe(section);
  });

  // Các lưới tour được render lại sau khi lọc. Nếu section đã kích hoạt,
  // hydrate ngay ảnh vừa thêm thay vì chờ một lần giao nhau không còn xảy ra.
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1 || !node.closest('.is-lazy-ready')) return;
      hydrate(node);
    }));
  }).observe(document.querySelector('main'), { childList: true, subtree: true });

  let flightStarted = false;
  const loadFlight = () => {
    if (flightStarted) return;
    flightStarted = true;
    loadGsap().then(() => Promise.all([
      loadScript('js/statement-motion.js'),
      loadScript('js/travel-map.js', true)
    ])).catch(() => {});
  };

  observeOnce('#flightMap', loadFlight);

  observeOnce('#reviews', () => {
    loadGsap().then(() => loadScript('js/says-motion.js')).catch(() => {});
  });
})();
