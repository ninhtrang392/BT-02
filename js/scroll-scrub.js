/* Vivu Travel hero: bounded, direction-aware image-sequence scrubber. */
(function () {
  'use strict';
  const shot = document.querySelector('.shot--hero');
  const video = document.getElementById('heroVideo');
  const canvas = document.getElementById('heroSequence');
  if (!shot || !video || !canvas) return;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const memory = Number(navigator.deviceMemory || 4);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const staticMode = reduced || Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType))) || memory <= 2;
  if (staticMode) {
    document.documentElement.dataset.heroScrub = 'static';
    return; // Poster remains visible; manifest/video are not downloaded.
  }

  document.documentElement.dataset.heroScrub = 'on';
  video.removeAttribute('autoplay');
  video.removeAttribute('loop');
  video.pause();
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return;

  const mobile = matchMedia('(max-width: 767px)').matches;
  const MAX_CONCURRENT = mobile ? 2 : 3;
  // Decoded bitmaps are far larger than their WebP files. These caps keep the
  // sequence around ~45 MB on mobile and ~105 MB on desktop at peak.
  const MAX_CACHED = mobile ? 12 : 18;
  const AHEAD = mobile ? 8 : 12;
  const BEHIND = mobile ? 3 : 4;
  // A decoded frame is only a safe visual substitute when it is within a few
  // playback steps of the requested one. On a fast scroll/direction change the
  // cache can still contain a frame from a completely different scene; drawing
  // that frame causes the sequence to flash to that scene and then jump back.
  const MAX_RENDER_GAP = 3;
  const DPR_CAP = 1.25;

  let sourceFrameCount = 0, playbackFrameCount = 0, frameUrl, onScreen = false, raf = 0;
  let targetFrame = 0, paintedFrame = -1, direction = 1;
  let targetProgress = 0;
  let cssWidth = 0, cssHeight = 0, clock = 0, destroyed = false;
  let shotTop = 0, scrollTravel = 1;
  const cache = new Map();       // index -> { bitmap, used }
  const queued = new Map();      // index -> priority
  const loading = new Map();     // index -> AbortController
  const failed = new Set();
  const metrics = {
    mode: mobile ? 'sequence-mobile' : 'sequence-desktop',
    requests: 0, decoded: 0, failed: 0, renders: 0, cachePeak: 0,
    firstFrameMs: null, startedAt: performance.now()
  };
  window.__heroScrubMetrics = metrics;

  function progress() {
    return Math.max(0, Math.min(1, (scrollY - shotTop) / scrollTravel));
  }

  function measureScrollRange() {
    const rect = shot.getBoundingClientRect();
    shotTop = scrollY + rect.top;
    scrollTravel = Math.max(1, rect.height - innerHeight);
  }

  function resizeCanvas() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return false;
    if (width === cssWidth && height === cssHeight) return false;
    cssWidth = width; cssHeight = height;
    const dpr = Math.max(1, Math.min(devicePixelRatio || 1, DPR_CAP));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    return true;
  }

  function drawCover(bitmap) {
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = bitmap.width / bitmap.height;
    let width = canvas.width, height = canvas.height, x = 0, y = 0;
    if (imageRatio > canvasRatio) { width = canvas.height * imageRatio; x = (canvas.width - width) / 2; }
    else { height = canvas.width / imageRatio; y = (canvas.height - height) / 2; }
    ctx.drawImage(bitmap, x, y, width, height);
    metrics.renders++;
  }

  function touch(index) {
    const entry = cache.get(index);
    if (entry) entry.used = ++clock;
    return entry;
  }

  function trimCache(centre, maxSize = MAX_CACHED) {
    if (cache.size <= maxSize) return;
    const victims = [...cache.entries()]
      .filter(([index]) => index !== paintedFrame && index !== centre)
      .sort((a, b) => a[1].used - b[1].used);
    while (cache.size > maxSize && victims.length) {
      const [index, entry] = victims.shift();
      if (entry.bitmap && entry.bitmap.close) entry.bitmap.close();
      cache.delete(index);
    }
  }

  function queueFrame(index, priority) {
    if (index < 0 || index >= sourceFrameCount || cache.has(index) || loading.has(index) || failed.has(index)) return;
    const old = queued.get(index);
    if (old === undefined || priority < old) queued.set(index, priority);
  }

  function fillQueue(centre) {
    const wanted = new Set([centre, targetFrame]);
    queueFrame(centre, 0);
    const centrePlayback = Math.round(centre * (playbackFrameCount - 1) / (sourceFrameCount - 1));
    for (let d = 1; d <= AHEAD; d++) {
      const playbackIndex = centrePlayback + direction * d;
      const index = sourceIndex(playbackIndex);
      wanted.add(index);
      queueFrame(index, d);
    }
    for (let d = 1; d <= BEHIND; d++) {
      const playbackIndex = centrePlayback - direction * d;
      const index = sourceIndex(playbackIndex);
      wanted.add(index);
      queueFrame(index, AHEAD + d);
    }
    // A fast jump invalidates pending work; at most three in-flight requests finish.
    for (const index of queued.keys()) if (!wanted.has(index)) queued.delete(index);
    pump();
  }

  async function decodeFrame(index, controller) {
    metrics.requests++;
    const response = await fetch(frameUrl(index), { signal: controller.signal, cache: 'force-cache' });
    if (!response.ok) throw new Error('frame ' + response.status);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }

  function pump() {
    while (loading.size < MAX_CONCURRENT && queued.size) {
      const [index] = [...queued.entries()].sort((a, b) => a[1] - b[1])[0];
      queued.delete(index);
      const controller = new AbortController();
      loading.set(index, controller);
      decodeFrame(index, controller).then(bitmap => {
        if (destroyed) {
          bitmap.close();
          return;
        }
        // Make room first so the cache never even transiently exceeds its cap.
        trimCache(targetFrame, MAX_CACHED - 1);
        cache.set(index, { bitmap, used: ++clock });
        metrics.decoded++;
        metrics.cachePeak = Math.max(metrics.cachePeak, cache.size);
        trimCache(targetFrame);
      }).catch(error => {
        if (error.name !== 'AbortError') {
          failed.add(index);
          metrics.failed++;
          // A missing/broken sequence must not leave a paused, invisible fallback.
          if (!cache.size && failed.size >= MAX_CONCURRENT) activateVideoFallback(error);
        }
      }).finally(() => {
        loading.delete(index);
        if (!destroyed) { schedule(); pump(); }
      });
    }
  }

  function nearestReady(wanted) {
    if (cache.has(wanted)) return wanted;
    let nearest = -1;
    let nearestDistance = Infinity;
    cache.forEach((_entry, index) => {
      const distance = Math.abs(index - wanted);
      if (distance < nearestDistance ||
          (distance === nearestDistance && (index - wanted) * direction < 0)) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    if (nearest < 0) return -1;
    const playbackGap = Math.abs(nearest - wanted) * (playbackFrameCount - 1) /
      Math.max(1, sourceFrameCount - 1);
    // Keep the last painted frame on screen until a relevant neighbour is
    // decoded. A short hold is much less noticeable than showing another shot.
    return playbackGap <= MAX_RENDER_GAP ? nearest : -1;
  }

  function sourceIndex(playbackIndex) {
    if (playbackIndex < 0 || playbackIndex >= playbackFrameCount) return -1;
    return Math.round(playbackIndex * (sourceFrameCount - 1) / (playbackFrameCount - 1));
  }

  function sourceFrame(progressValue) {
    return sourceIndex(Math.round(progressValue * (playbackFrameCount - 1)));
  }

  function render() {
    raf = 0;
    if (!onScreen) return;
    const readyIndex = nearestReady(targetFrame);
    if (readyIndex < 0) {
      return;
    }
    if (readyIndex === paintedFrame) {
      return;
    }
    const entry = touch(readyIndex);
    if (!entry) return;
    drawCover(entry.bitmap);
    paintedFrame = readyIndex;
    canvas.classList.add('is-on');
    shot.classList.add('hero-scrub-on');
    if (metrics.firstFrameMs === null) metrics.firstFrameMs = Math.round(performance.now() - metrics.startedAt);
  }

  function schedule() { if (onScreen && !raf) raf = requestAnimationFrame(render); }

  function updateTarget() {
    const next = progress();
    direction = next >= targetProgress ? 1 : -1;
    targetProgress = next;
    targetFrame = sourceFrame(targetProgress);
    // Fetch/decode is kicked off by the scroll target update, never by render().
    fillQueue(targetFrame);
    schedule();
  }

  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    removeEventListener('scroll', updateTarget);
    removeEventListener('pagehide', cleanup);
    queued.clear();
    loading.forEach(controller => controller.abort());
    loading.clear();
    cache.forEach(entry => entry.bitmap.close());
    cache.clear();
  }

  // Canvas dimensions are updated only here, never from the scroll handler/render path.
  const resizeObserver = new ResizeObserver(() => {
    measureScrollRange();
    if (resizeCanvas()) {
      paintedFrame = -1;
      schedule();
    }
  });
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) schedule();
  });

  function activateVideoFallback(error) {
    if (destroyed) return;
    metrics.mode = 'video-fallback';
    cleanup();
    document.documentElement.dataset.heroScrub = 'fallback';
    measureScrollRange();
    video.load();
    video.pause();

    // If fetch/createImageBitmap is unavailable (notably on file://), scrub the
    // fallback video itself. It must never autoplay or seek directly in scroll.
    let fallbackRaf = 0;
    const seekFallback = () => {
      fallbackRaf = 0;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      const wantedTime = progress() * video.duration;
      if (Math.abs(video.currentTime - wantedTime) > 0.015) video.currentTime = wantedTime;
    };
    const scheduleFallback = () => {
      if (!fallbackRaf) fallbackRaf = requestAnimationFrame(seekFallback);
    };
    const resizeFallback = () => {
      measureScrollRange();
      scheduleFallback();
    };
    const stopFallback = () => {
      if (fallbackRaf) cancelAnimationFrame(fallbackRaf);
      removeEventListener('scroll', scheduleFallback);
      removeEventListener('resize', resizeFallback);
      video.removeEventListener('loadedmetadata', scheduleFallback);
    };
    addEventListener('scroll', scheduleFallback, { passive: true });
    addEventListener('resize', resizeFallback, { passive: true });
    addEventListener('pagehide', stopFallback, { once: true });
    video.addEventListener('loadedmetadata', scheduleFallback);
    scheduleFallback();
    console.warn('[hero-scrub] Video fallback:', error.message);
  }

  async function start() {
    try {
      if (!('createImageBitmap' in window)) throw new Error('createImageBitmap unavailable');
      const preferred = mobile ? 'frames/hero-mobile/manifest.json' : 'frames/hero/manifest.json';
      // Revalidate the manifest: regenerated sequences reuse frame filenames,
      // so a force-cached manifest can keep an obsolete frame set alive.
      let response = await fetch(preferred, { cache: 'no-cache' });
      if (!response.ok && mobile) response = await fetch('frames/hero/manifest.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('manifest ' + response.status);
      const manifest = await response.json();
      sourceFrameCount = Number(manifest.frameCount);
      if (!Number.isFinite(sourceFrameCount) || sourceFrameCount < 2) throw new Error('invalid frameCount');
      // Decoding 400 full-size bitmaps is needlessly expensive for this scroll distance.
      // Sample at most 200 evenly-spaced source frames while preserving 0..1 progress.
      playbackFrameCount = Math.min(sourceFrameCount, 200);
      metrics.sourceFrames = sourceFrameCount;
      metrics.playbackFrames = playbackFrameCount;
      const base = String(manifest.basePath).replace(/\/+$/, '');
      const extension = manifest.extension || 'webp';
      const pad = ((manifest.pattern || '').match(/(\d+)/) || ['', '00001'])[1].length;
      const version = encodeURIComponent(String(manifest.version || `${sourceFrameCount}-${manifest.duration || 0}`));
      frameUrl = index => `${base}/frame-${String(index + 1).padStart(pad, '0')}.${extension}?v=${version}`;
      measureScrollRange();
      targetProgress = progress();
      resizeCanvas();
      resizeObserver.observe(canvas);
      resizeObserver.observe(shot);
      intersectionObserver.observe(shot);
      addEventListener('scroll', updateTarget, { passive: true });
      addEventListener('pagehide', cleanup, { once: true });
      targetFrame = sourceFrame(targetProgress);
      // The poster is already preloaded and paints the LCP. During startup only
      // fetch the matching canvas frame; neighbours wait for an actual scroll so
      // they cannot compete with fonts, GSAP and the initial hero render.
      queueFrame(targetFrame, 0);
      pump();
    } catch (error) {
      activateVideoFallback(error);
    }
  }
  start();
})();
