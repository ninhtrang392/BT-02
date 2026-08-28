/* One-shot cinematic reveal for the landing hero. */
(function () {
  'use strict';

  const root = document.documentElement;
  const title = document.querySelector('.shot--hero .display--slogan');
  const search = document.querySelector('.shot--hero .search-card');
  const cue = document.querySelector('.shot--hero .scroll-cue');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealWithoutMotion = () => {
    root.classList.add('hero-motion-ready');
    root.classList.remove('hero-motion-pending');
  };

  if (!title || !search || !cue || reduced) {
    if (reduced) root.classList.add('hero-motion-reduced');
    revealWithoutMotion();
    return;
  }

  if (!window.gsap || !window.SplitText) {
    revealWithoutMotion();
    return;
  }

  gsap.registerPlugin(SplitText);
  root.classList.add('hero-motion-ready');

  let hasPlayed = false;
  const split = SplitText.create(title, {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    linesClass: 'hero-line',
    wordsClass: 'hero-word',
    onSplit(instance) {
      const timeline = gsap.timeline({ paused: hasPlayed });
      const lineWords = instance.lines.map(line =>
        instance.words.filter(word => line.contains(word))
      );

      gsap.set([title, search, cue], { autoAlpha: 1 });
      lineWords.forEach((words, lineIndex) => {
        timeline.fromTo(words, {
          yPercent: 110,
          opacity: 0,
          rotationX: -10,
          filter: 'blur(5px)',
          transformOrigin: '50% 100%'
        }, {
          yPercent: 0,
          opacity: 1,
          rotationX: 0,
          filter: 'blur(0px)',
          duration: 1.1,
          stagger: 0.04,
          ease: 'power4.out',
          force3D: true
        }, lineIndex * 0.18);
      });

      timeline.fromTo(search, { y: 24, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power4.out',
        clearProps: 'transform'
      }, '>');
      timeline.fromTo(cue, { y: 14, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.65,
        ease: 'power3.out',
        clearProps: 'transform'
      }, '>');

      if (hasPlayed) {
        timeline.progress(1);
      } else {
        timeline.eventCallback('onComplete', () => {
          hasPlayed = true;
          gsap.set(instance.words, { clearProps: 'willChange,transform,filter,opacity' });
        });
      }
      return timeline;
    }
  });

  root.classList.remove('hero-motion-pending');
})();
