/*
 * Project Hub — background shader
 * Paper Shaders MeshGradient (vanilla ShaderMount, no React).
 * Locked dark params 2026-05-02 from sandbox at site/_preview/shader-bg.html.
 * Light palette added 2026-05-04 — same motion params, cream/dusty-rose stops.
 *
 * Mounts to #bg-shader. Theme-aware: a MutationObserver on <html data-theme>
 * live-swaps uniforms via setUniforms (no remount, no flash to default).
 */
import {
  ShaderMount,
  meshGradientFragmentShader,
  getShaderColorFromString,
} from 'https://esm.sh/@paper-design/shaders@0.0.76';

const DARK_PARAMS = Object.freeze({
  colors:       ['#1D1617', '#5C1A1B', '#722F37', '#000000'],
  speed:        0.81,
  distortion:   0.52,
  swirl:        0.17,
  grainMixer:   0.06,
  grainOverlay: 0.00,
  scale:        0.81,
});

const LIGHT_PARAMS = Object.freeze({
  colors:       ['#F0EBE3', '#E0CDC8', '#D2B5B4', '#FAF7F2'],
  speed:        0.81,
  distortion:   0.52,
  swirl:        0.17,
  grainMixer:   0.06,
  grainOverlay: 0.00,
  scale:        0.81,
});

const FIT_COVER = 2;

function paramsForTheme(theme) {
  return theme === 'light' ? LIGHT_PARAMS : DARK_PARAMS;
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function buildUniforms(p) {
  return {
    u_colors:       p.colors.map(getShaderColorFromString),
    u_colorsCount:  p.colors.length,
    u_distortion:   p.distortion,
    u_swirl:        p.swirl,
    u_grainMixer:   p.grainMixer,
    u_grainOverlay: p.grainOverlay,
    u_fit:          FIT_COVER,
    u_scale:        p.scale,
    u_rotation:     0,
    u_offsetX:      0,
    u_offsetY:      0,
    u_originX:      0.5,
    u_originY:      0.5,
    u_worldWidth:   0,
    u_worldHeight:  0,
  };
}

function mount() {
  const parent = document.getElementById('bg-shader');
  if (!parent) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initial = paramsForTheme(currentTheme());

  try {
    const m = new ShaderMount(
      parent,
      meshGradientFragmentShader,
      buildUniforms(initial),
      undefined,
      reduced ? 0 : initial.speed,
      0,
    );
    window.__bg = m;

    const obs = new MutationObserver(() => {
      const p = paramsForTheme(currentTheme());
      try {
        m.setUniforms(buildUniforms(p));
        if (typeof m.setSpeed === 'function') m.setSpeed(reduced ? 0 : p.speed);
      } catch (err) {
        console.error('shader-bg theme swap failed:', err);
      }
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  } catch (err) {
    console.error('shader-bg mount failed:', err);
    parent.classList.add('bg-fallback');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
