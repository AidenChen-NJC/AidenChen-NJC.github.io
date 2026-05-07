/*
 * Project Hub — V1 site logic
 * Single-concern handlers, no overlapping transforms per element.
 *  - Preloader (fonts + window load gate)
 *  - Reveal-on-scroll
 *  - Top scroll progress bar
 *  - Hero scroll-zoom (Apple camera-through-letters)
 *  - Projects horizontal pin-scroll
 */
(function() {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = matchMedia('(max-width: 768px)').matches;

  /* === Preloader === */
  (async function gate() {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }
    requestAnimationFrame(() => {
      document.body.classList.add('ready');
      const pl = document.getElementById('preload');
      if (pl) { pl.classList.add('gone'); setTimeout(() => pl.remove(), 700); }
    });
  })();

  /* Background shader: see js/shader-bg.js (Paper Shaders MeshGradient).
   * It self-mounts to #bg-shader and self-pauses when tab is hidden. */

  /* === Reveal on scroll === */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.05 });
  document.querySelectorAll('.reveal, [data-stagger]').forEach(el => revealIO.observe(el));

  /* === Top scroll progress === */
  const progress = document.querySelector('.progress');
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) : 0;
    if (progress) progress.style.setProperty('--p', p.toFixed(4));
  }

  /* === Hero scroll-zoom — SVG text + perspective dolly + motion blur + vignette === */
  const heroZoom = document.querySelector('.hero-zoom');
  const heroStage = heroZoom ? heroZoom.querySelector('.hero-stage') : null;
  const heroVignette = heroZoom ? heroZoom.querySelector('.hero-vignette') : null;
  const heroEyebrow = heroZoom ? heroZoom.querySelector('.hero-eyebrow') : null;
  const heroSub = heroZoom ? heroZoom.querySelector('.hero-sub') : null;
  const postZoom = document.querySelector('.post-zoom');

  // Perspective dolly math: apparent_scale = P / (P - Z) ; P=1400 here.
  // Z ramps 0 → 1320, so apparent scale ramps 1 → ~17.5x but non-linearly (slow start, fast finish).
  const HERO_P = 1400;
  const HERO_Z_MAX = 1320;

  function updateHeroZoom() {
    if (!heroZoom || !heroStage || reduced) return;
    const r = heroZoom.getBoundingClientRect();
    const runway = r.height - window.innerHeight;
    const p = runway > 0 ? Math.max(0, Math.min(1, -r.top / runway)) : 0;

    const tz = p * HERO_Z_MAX;

    // Motion blur: 0 → peak ~6px around p=0.55, back toward 0 at fade-out
    const blurPeak = 6;
    const blur = p < 0.55
      ? (p / 0.55) * blurPeak
      : Math.max(0, blurPeak * (1 - (p - 0.55) / 0.35));

    // Opacity: stays 1 until 0.72, fades to 0 by 0.92
    const opacity = p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.20);

    heroStage.style.transform = `translate3d(0,0,${tz.toFixed(1)}px)`;
    heroStage.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
    heroStage.style.opacity = opacity.toFixed(3);

    // Vignette: starts at p=0.3, peaks ~0.8
    if (heroVignette) {
      const vRamp = Math.max(0, Math.min(1, (p - 0.3) / 0.5));
      heroVignette.style.opacity = vRamp.toFixed(3);
    }

    // Eyebrow + scroll cue fade out by p=0.3
    if (heroEyebrow) heroEyebrow.style.opacity = Math.max(0, 1 - p / 0.3).toFixed(3);
    if (heroSub) heroSub.style.opacity = Math.max(0, 1 - p / 0.2).toFixed(3);

    // Light the post-zoom intro once the camera passes through
    if (postZoom) {
      if (p > 0.7) postZoom.classList.add('lit');
      else postZoom.classList.remove('lit');
    }
  }

  /* === Projects horizontal pin-scroll === */
  const projPin = document.querySelector('.proj-pin');
  const projTrack = projPin ? projPin.querySelector('.proj-track') : null;
  const projBar = projPin ? projPin.querySelector('.proj-progress-bar') : null;
  const projNum = projPin ? projPin.querySelector('.proj-progress-num') : null;
  const projCardCount = projTrack ? projTrack.children.length : 0;

  function updateProjPin() {
    if (!projPin || !projTrack || reduced || isMobile) return;
    const r = projPin.getBoundingClientRect();
    const runway = r.height - window.innerHeight;
    const p = runway > 0 ? Math.max(0, Math.min(1, -r.top / runway)) : 0;

    const distance = projTrack.scrollWidth - window.innerWidth;
    if (distance > 0) {
      projTrack.style.transform = `translate3d(${(-p * distance).toFixed(2)}px, 0, 0)`;
    }

    if (projBar) projBar.style.width = (p * 100).toFixed(2) + '%';
    if (projNum && projCardCount > 0) {
      const idx = Math.min(projCardCount, Math.floor(p * projCardCount) + 1);
      projNum.textContent = String(idx).padStart(2, '0');
    }
  }

  /* === RAF-batched scroll handler === */
  let scrollRaf = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      updateProgress();
      updateHeroZoom();
      updateProjPin();
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* === Theme toggle ===
     FOUC script in <head> resolves the theme before paint:
       sessionStorage.theme wins; else per-page default (/blog/* → light, else → dark).
     First visit does NOT write storage — the per-page default keeps applying
     across pages until the user explicitly toggles. On toggle, the choice is
     persisted in sessionStorage (tab-scoped); closing the tab or opening a
     new one resets to the per-page default. */
  const THEME_COLOR_DARK  = '#08070A';
  const THEME_COLOR_LIGHT = '#F0EBE3';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme, btn, meta) {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    if (meta) meta.setAttribute('content', theme === 'light' ? THEME_COLOR_LIGHT : THEME_COLOR_DARK);
    if (btn) btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  const themeBtn  = document.getElementById('theme-toggle');
  const themeMeta = document.getElementById('theme-color-meta');
  if (themeBtn) {
    applyTheme(currentTheme(), themeBtn, themeMeta);
    themeBtn.addEventListener('click', () => {
      const next = currentTheme() === 'light' ? 'dark' : 'light';
      applyTheme(next, themeBtn, themeMeta);
      try { sessionStorage.setItem('theme', next); } catch (e) {}
    });
  }
})();
